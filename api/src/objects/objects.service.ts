import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { ObjectEntity, ObjectDocument } from './schemas/object.schema';
import { CreateObjectDto } from './dto/create-object.dto';
import { FindObjectsQueryDto } from './dto/find-objects-query.dto';
import { S3Service } from '../storage/s3.service';
import { EventsGateway } from '../events/events.gateway';

export interface PaginatedObjects {
  items: ObjectDocument[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ObjectsService {
  constructor(
    @InjectModel(ObjectEntity.name)
    private readonly objectModel: Model<ObjectDocument>,
    private readonly s3Service: S3Service,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(
    dto: CreateObjectDto,
    file: Express.Multer.File,
  ): Promise<ObjectDocument> {
    const { url } = await this.s3Service.uploadFile(file);

    const created = await this.objectModel.create({
      title: dto.title,
      description: dto.description,
      imageUrl: url,
      createdAt: new Date(),
    });

    this.eventsGateway.emitObjectCreated(created);

    return created;
  }

  async findAll(query: FindObjectsQueryDto): Promise<PaginatedObjects> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.objectModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.objectModel.countDocuments().exec(),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<ObjectDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Object with id "${id}" not found`);
    }

    const found = await this.objectModel.findById(id).exec();
    if (!found) {
      throw new NotFoundException(`Object with id "${id}" not found`);
    }

    return found;
  }

  async remove(id: string): Promise<void> {
    const found = await this.findOne(id);

    const key = this.s3Service.extractKeyFromUrl(found.imageUrl);
    await this.s3Service.deleteFile(key);

    await this.objectModel.deleteOne({ _id: found._id }).exec();

    this.eventsGateway.emitObjectDeleted(id);
  }
}
