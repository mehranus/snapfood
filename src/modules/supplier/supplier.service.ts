import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Scope, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SupplierEntity } from "./entities/supplier.entity";
import { Repository } from "typeorm";
import { CategoryService } from "../category/category.service";
import { LoginSuppliarDto, SinUpSupplierDto, SuppliarInfoDto, SuppliarUploadDocDto } from "./dto/supplier.dto";
import { OtpSuppliarEntity } from "./entities/otp.entity";
import { randomInt } from "crypto";
import { checkOtpDto } from "../auth/dto/auth.dto";
import { TokenPailod } from "../auth/types/paylod";
import { JwtService } from "@nestjs/jwt";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { statusSuppliar } from "./enum/status.enum";
import { ContractTypeFile, DocumentTypeFile, ImageTypeFile } from "./types/document.type";
import { S3Service } from "../s3/s3.service";
import { SuppliarDocumentEntity } from "./entities/document.entity";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import slugify from "slugify";




@Injectable({scope:Scope.REQUEST})
export class SupplierService {
    constructor(
      @InjectRepository(SupplierEntity) private readonly suppliarRepository:Repository<SupplierEntity>,
      @InjectRepository(OtpSuppliarEntity) private readonly otpsuppliarRepository:Repository<OtpSuppliarEntity>,
      @InjectRepository(SuppliarDocumentEntity) private readonly suppliarDocRepository:Repository<SuppliarDocumentEntity>,
     
      private readonly categooryService:CategoryService,
      private readonly jwtSirvis:JwtService,
      private readonly s3serivic:S3Service,
      @Inject(REQUEST) private readonly req:Request
    ){}

   async sinUp(sinUpDto:SinUpSupplierDto){
    const {
      categooryId,
      invait_code,
      city,
      mangaer_family,
      mangaer_name,
      phone,
      store_name
    }=sinUpDto
     const slug=slugify(`${store_name}-${mangaer_family}`)
    const suppliarCheck=await this.suppliarRepository.findOneBy({phone})
    const suppliarSlugCheck=await this.suppliarRepository.findOneBy({slug})
    
    if(suppliarSlugCheck) throw new ConflictException("suppliar accont by slug alredy exist!")
    if(suppliarCheck) throw new ConflictException("suppliar accont alredy exist!")
    const category=await this.categooryService.findOneById(categooryId)
  
    const mobileNumber=parseInt(phone)

  let agent:SupplierEntity=null;
  if(invait_code){
    agent =await this.suppliarRepository.findOneBy({invait_code})
  }
   
    const suppliar= this.suppliarRepository.create({
      categooryId:category.id,
      mangaer_family,
      mangaer_name,
      phone,
      slug,
      city,
      store_name,
      agentId:agent?.id ?? null,
      invait_code:mobileNumber.toString(32).toUpperCase()

    })

    await this.suppliarRepository.save(suppliar)
    await this.createOtpSuppliar(suppliar)
    return{
      message:"send code suppliar succesfully"
    }

   }

   async logIn(loginDto:LoginSuppliarDto){
    const {phone}=loginDto
    const suppliar =await this.suppliarRepository.findOneBy({phone})
    if(!suppliar) throw new NotFoundException("suppliar not fund accont")
    await this.createOtpSuppliar(suppliar)
    return{
      message:"send code suppliar succesfully"
    }
   }
   async createOtpSuppliar(suppliar:SupplierEntity){
    const code =randomInt(10000,99999).toString();
    const ExpiresIn=new Date(new Date().getTime() +1000 *60 *2);

    let otp=await this.otpsuppliarRepository.findOneBy({suppliarId:suppliar.id})
     if(otp){
      if(otp.expiresIn > new Date()){
        throw new BadRequestException("code is not expierd")
      }
      otp.code=code;
      otp.expiresIn=ExpiresIn
     }else{
      otp= this.otpsuppliarRepository.create({code:code,expiresIn:ExpiresIn,suppliarId:suppliar.id})
     }
     await this.otpsuppliarRepository.save(otp)
     suppliar.otpId=otp.id
     await this.suppliarRepository.save(suppliar)
  }

  async supplemntyInfomation(infoDto:SuppliarInfoDto){
    const {id}=this.req.suppliar
    const {email,national_code}=infoDto

    let suppliar=await this.suppliarRepository.findOneBy({email})
    if(suppliar && suppliar.id !== id ) throw new ConflictException("email alredy exist!")

     suppliar=await this.suppliarRepository.findOneBy({national_code})
    if(suppliar && suppliar.id !== id ) throw new ConflictException("national_code alredy exist!")

      await this.suppliarRepository.update({id},{
        email,
        national_code,
        status:statusSuppliar.SuppliartyInformation
      })

      return{
        message:"Update Suppliar Info Sucssesfully"
      }

  }

  async uploadDocSuppliar(suppliarDocDto:SuppliarUploadDocDto,files:DocumentTypeFile){

    const {id}=this.req.suppliar
    const {acsseptDoc,image}=files

    const suppliar=await this.suppliarRepository.findOneBy({id})
  

    
    if(!suppliar) throw new NotFoundException("suppliar not found!")

      let isDocument= await this.suppliarDocRepository.findOneBy({supplerId:suppliar.id})
      if(isDocument){
        await this.s3serivic.deleteFile(isDocument.imageKey)
        await this.s3serivic.deleteFile(isDocument.acsseptDocKey)
      }else{
          isDocument=this.suppliarDocRepository.create({supplerId:suppliar.id})
      }
       
    const imageResalt=await this.s3serivic.uploadFile(image[0],"images")      
    const documentResalt=await this.s3serivic.uploadFile(acsseptDoc[0],"acsseptDoc")      
   
       
   
    
    if(imageResalt){
      isDocument.image=imageResalt.Location;
      isDocument.imageKey=imageResalt.Key;
    } 
    if(documentResalt){
      isDocument.acsseptDoc=documentResalt.Location;
      isDocument.acsseptDocKey=documentResalt.Key;
    } 
    await this.suppliarDocRepository.save(isDocument)

    suppliar.status=statusSuppliar.UploadDocument;

    await this.suppliarRepository.save(suppliar)
    return{
      message:"upload document sucsesfully"
    }
    

    

  }

  async uploadConcract(files:ContractTypeFile){
    const {id}=this.req.suppliar
    const {contract}=files

    const suppliar=await this.suppliarRepository.findOneBy({id})
 

    
    if(!suppliar) throw new NotFoundException("suppliar not found!")

      const ContractResalt=await this.s3serivic.uploadFile(contract[0],"contract")

      if(ContractResalt) suppliar.contract=ContractResalt.Location
      suppliar.status=statusSuppliar.Contract
      await this.suppliarRepository.save(suppliar)
      return{
        message:"upload contract sucssefuly"
      }
  }


  async UpdateSupliar(updateSupplierDto:UpdateSupplierDto,files:ImageTypeFile){
    const {id}=this.req.suppliar
    const {image_back,logo}=files
    const {discription,pick}=updateSupplierDto
    const supliar=await this.suppliarRepository.findOneBy({id})
    if(!supliar) throw new NotFoundException("not found suppliar!")

      if(supliar.status !== statusSuppliar.Contract)
        throw new BadRequestException("pleas first compliat save contract")

      const imageBack=await this.s3serivic.uploadFile(image_back[0],"imageSupliar")
      const imagelogo=await this.s3serivic.uploadFile(logo[0],"imageSupliar")
      if(discription) supliar.discription=discription
      if(imageBack) supliar.image_back=imageBack.Location
      if(imagelogo) supliar.logo=imagelogo.Location
      if(pick) supliar.pick=pick
         supliar.status=statusSuppliar.Verify

         await this.suppliarRepository.save(supliar)

         return{
          message:"update Supliar ready for add item"
         }


  }

  async checkOtp(checkOtpDto:checkOtpDto){
    const {mobile,code}=checkOtpDto
    const suppliar=await this.suppliarRepository.findOne({
      where:{phone:mobile},
      relations:{
        otp:true
      }
    })
    const now=new Date();
    if(!suppliar || !suppliar?.otp) throw new UnauthorizedException("Not Find User Accoant")
      const otp=suppliar?.otp;
    if(otp?.code !== code) throw new UnauthorizedException("code is inccrement");
    if(otp?.expiresIn < now ) throw new UnauthorizedException(" code is expired") 
      if(!suppliar.verifay_mobail){
        await this.suppliarRepository.update({id:suppliar.id},{
          verifay_mobail:true
        })
      }
      const {acssesToken,refreshToken}=this.makeTokenForUser({mobile:mobile,userId:suppliar.id})
      return {
        acssesToken,
        refreshToken,
        message:"you logged_in sucessfuly"
      }
  }

  makeTokenForUser(pailod:TokenPailod){
    const acssesToken= this.jwtSirvis.sign(pailod,{
      secret:process.env.ACSSES_TOKEN_SECRET,
      expiresIn:"30d"
    })
    const refreshToken= this.jwtSirvis.sign(pailod,{
      secret:process.env.REFRESH_TOKEN_SECRET,
      expiresIn:"1y"
    })
    return{
      acssesToken,refreshToken
    }
  }
  async validateAcsesToken(token:string){
    try {
      const paylod=this.jwtSirvis.verify<TokenPailod>(token,{
        secret:process.env.ACSSES_TOKEN_SECRET
      })
      if(typeof paylod=="object" && paylod?.userId){
          const user=await this.suppliarRepository.findOneBy({id:paylod.userId})
          if(!user) throw new UnauthorizedException("login on Accont")
            return user
      }
      throw new UnauthorizedException("login on Accont")
    } catch (error) {
      throw new UnauthorizedException("login on Accont")
    }
  }







  //! Find supliar
  async findSupliar(id:number){
    const supliar =await this.suppliarRepository.findOneBy({id})
    if(!supliar) throw new NotFoundException("suppliar not found!")
      return supliar
  }
  async findSlugSupliar(slug:string){
    const supliar =await this.suppliarRepository.findOneBy({slug})
    if(!supliar) throw new NotFoundException("suppliar not found!")
      return supliar
  }

  async ststusSupliar(id:number){
    const ststus= await this.findSupliar(id)
    if(ststus.status !== statusSuppliar.Verify) throw new BadRequestException("pleas first accont veryfuay")
  }

}
