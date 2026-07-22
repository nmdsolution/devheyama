import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ObjectsService } from './objects.service';
import { CreateObjectDto } from './dto/create-object.dto';
import { FindObjectsQueryDto } from './dto/find-objects-query.dto';

@Controller('objects')
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createObjectDto: CreateObjectDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.objectsService.create(createObjectDto, file);
  }

  @Get()
  findAll(@Query() query: FindObjectsQueryDto) {
    return this.objectsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.objectsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.objectsService.remove(id);
  }
}
