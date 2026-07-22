import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { ObjectEntity, ObjectDocument } from './schemas/object.schema';
import { CreateObjectDto } from './dto/create-object.dto';
import { S3Service } from '../storage/s3.service';
import { EventsGateway } from '../events/events.gateway';

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

  async findAll(): Promise<ObjectDocument[]> {
    return this.objectModel.find().sort({ createdAt: -1 }).exec();
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
