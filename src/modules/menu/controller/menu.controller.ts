import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";

import { UpdateMenuDto } from "../dto/update-menu.dto";
import { MenuService } from "../service/menu.service";
import { MenuDto } from "../dto/menu.dto";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import { SppliarAuth } from "src/common/decorators/auth.decorator";
import { TypeData } from "src/common/enum/type-data.enum";
import { UpladFileS3 } from "src/common/interceptor/upload-file.interceptor";
import { MIME_TYPES } from "src/common/enum/type-image.enum";
import { SkipAuth } from "src/common/decorators/skip-auth.decorator";

@Controller("menu")
@ApiTags("Menu")
@SppliarAuth()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}


  @Post()
  @ApiConsumes(TypeData.MultipartData)
  @UseInterceptors(UpladFileS3("image"))
  createMenu(@Body() menuDto:MenuDto,  @UploadedFile(
    new ParseFilePipe({
      validators:[
        new MaxFileSizeValidator({maxSize:2 * 1024 * 1024}),
        new FileTypeValidator({fileType:`(${MIME_TYPES.JPG}|${MIME_TYPES.PNG})|${MIME_TYPES.JPEG}`})
      ]
    })
  )  image:Express.Multer.File ){
    return this.menuService.createItemMenu(menuDto,image)
  }



  @Get('all-by-slug/:slug')
  @SkipAuth()
  @ApiConsumes(TypeData.UrlEncoded,TypeData.Json)
  findAll(@Param('slug') slug:string){
    return this.menuService.findAll(slug)
  }
}