import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ObjectDocument = HydratedDocument<ObjectEntity>;

@Schema({ collection: 'objects' })
export class ObjectEntity {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true, default: () => new Date() })
  createdAt: Date;
}

export const ObjectSchema = SchemaFactory.createForClass(ObjectEntity);
