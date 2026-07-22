import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ObjectsService } from './objects.service';
import { ObjectEntity } from './schemas/object.schema';
import { S3Service } from '../storage/s3.service';
import { EventsGateway } from '../events/events.gateway';

describe('ObjectsService', () => {
  let service: ObjectsService;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    deleteOne: jest.Mock;
    countDocuments: jest.Mock;
  };
  let s3Service: {
    uploadFile: jest.Mock;
    deleteFile: jest.Mock;
    extractKeyFromUrl: jest.Mock;
  };
  let eventsGateway: {
    emitObjectCreated: jest.Mock;
    emitObjectDeleted: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
    };
    s3Service = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      extractKeyFromUrl: jest.fn(),
    };
    eventsGateway = {
      emitObjectCreated: jest.fn(),
      emitObjectDeleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectsService,
        { provide: getModelToken(ObjectEntity.name), useValue: model },
        { provide: S3Service, useValue: s3Service },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<ObjectsService>(ObjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    function mockFind(items: unknown[]) {
      const sort = jest.fn().mockReturnThis();
      const skip = jest.fn().mockReturnThis();
      const limit = jest.fn().mockReturnThis();
      const exec = jest.fn().mockResolvedValue(items);
      model.find.mockReturnValue({ sort, skip, limit, exec });
      return { sort, skip, limit, exec };
    }

    function mockCountDocuments(total: number) {
      const exec = jest.fn().mockResolvedValue(total);
      model.countDocuments.mockReturnValue({ exec });
      return exec;
    }

    it('uses default pagination values (page 1, limit 12) when none are provided', async () => {
      const items = [{ _id: '1' }, { _id: '2' }];
      const { sort, skip, limit } = mockFind(items);
      mockCountDocuments(2);

      const result = await service.findAll({});

      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(skip).toHaveBeenCalledWith(0);
      expect(limit).toHaveBeenCalledWith(12);
      expect(result).toEqual({ items, total: 2, page: 1, limit: 12 });
    });

    it('applies a custom page/limit and computes the correct skip', async () => {
      const items = [{ _id: '3' }];
      const { skip, limit } = mockFind(items);
      mockCountDocuments(25);

      const result = await service.findAll({ page: 3, limit: 5 });

      expect(skip).toHaveBeenCalledWith(10);
      expect(limit).toHaveBeenCalledWith(5);
      expect(result).toEqual({ items, total: 25, page: 3, limit: 5 });
    });

    it('returns total reflecting countDocuments regardless of page size', async () => {
      const items = [{ _id: '1' }];
      mockFind(items);
      const countExec = mockCountDocuments(42);

      const result = await service.findAll({ page: 1, limit: 1 });

      expect(countExec).toHaveBeenCalled();
      expect(result.total).toBe(42);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a malformed id string', async () => {
      await expect(service.findOne('not-a-valid-object-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(model.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a valid-but-nonexistent id', async () => {
      const id = new Types.ObjectId().toHexString();
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      expect(model.findById).toHaveBeenCalledWith(id);
    });

    it('returns the document when found', async () => {
      const id = new Types.ObjectId().toHexString();
      const found = { _id: id, title: 't', description: 'd', imageUrl: 'u' };
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(found),
      });

      await expect(service.findOne(id)).resolves.toEqual(found);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException if the object does not exist', async () => {
      const id = new Types.ObjectId().toHexString();
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
      expect(s3Service.deleteFile).not.toHaveBeenCalled();
      expect(model.deleteOne).not.toHaveBeenCalled();
      expect(eventsGateway.emitObjectDeleted).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a malformed id before touching S3/Mongo delete', async () => {
      await expect(service.remove('not-a-valid-object-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(s3Service.deleteFile).not.toHaveBeenCalled();
      expect(model.deleteOne).not.toHaveBeenCalled();
    });

    it('deletes from S3 and Mongo and emits object:deleted when found', async () => {
      const id = new Types.ObjectId().toHexString();
      const found = {
        _id: id,
        title: 't',
        description: 'd',
        imageUrl: 'https://cdn.example.com/objects/key123.png',
      };
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(found),
      });
      model.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });
      s3Service.extractKeyFromUrl.mockReturnValue('objects/key123.png');

      await service.remove(id);

      expect(s3Service.extractKeyFromUrl).toHaveBeenCalledWith(found.imageUrl);
      expect(s3Service.deleteFile).toHaveBeenCalledWith('objects/key123.png');
      expect(model.deleteOne).toHaveBeenCalledWith({ _id: found._id });
      expect(eventsGateway.emitObjectDeleted).toHaveBeenCalledWith(id);

      // S3 delete must happen before the Mongo delete completes.
      const s3Order = s3Service.deleteFile.mock.invocationCallOrder[0];
      const mongoOrder = model.deleteOne.mock.invocationCallOrder[0];
      expect(s3Order).toBeLessThan(mongoOrder);
    });
  });

  describe('create', () => {
    it('uploads to S3 and saves a document with the returned URL', async () => {
      const dto = { title: 'Title', description: 'Desc' };
      const file = {
        originalname: 'pic.png',
        mimetype: 'image/png',
        buffer: Buffer.from('data'),
      } as Express.Multer.File;

      s3Service.uploadFile.mockResolvedValue({
        key: 'objects/abc.png',
        url: 'https://cdn.example.com/objects/abc.png',
      });

      const created = {
        _id: new Types.ObjectId().toHexString(),
        title: dto.title,
        description: dto.description,
        imageUrl: 'https://cdn.example.com/objects/abc.png',
      };
      model.create.mockResolvedValue(created);

      const result = await service.create(dto, file);

      expect(s3Service.uploadFile).toHaveBeenCalledWith(file);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: dto.title,
          description: dto.description,
          imageUrl: 'https://cdn.example.com/objects/abc.png',
        }),
      );
      expect(eventsGateway.emitObjectCreated).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });
});
