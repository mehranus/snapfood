import { BaseEntity } from "src/common/abestracs/base.entity";
import { EntityName } from "src/common/enum/entity-name.enum";
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from "typeorm";
import { UserAdressEntity } from "./addres.entity";
import { OtpEntity } from "./otp.entity";
import { FeedBackEntity } from "src/modules/menu/entities/feedback.entity";
import { UserStatus } from "../enum/user.enum";
import { BasketEntity } from "src/modules/basket/entities/basket.entity";
import { OrderEntity } from "src/modules/order/entities/order.entity";
import { PaymentEntity } from "src/modules/payment/entities/payment.entity";

@Entity(EntityName.User)
export class UserEntity extends BaseEntity{
   @Column({nullable:true})
   first_name:string
   @Column({nullable:true})
   last_name:string

   @Column({unique:true})
   phone:string

   @Column({unique:true,nullable:true})
   email:string

   @Column({unique:true,nullable:true})
   invait_code:string

   @Column({default:UserStatus.Rejected})
   status:string

   @Column({default:false,nullable:true})
   verifay_mobail:boolean

   @Column({default:5})
   scoer:number

   @Column({nullable:true})
   agentId:number


   @OneToMany(()=>UserAdressEntity,(address)=>address.user)
   addressList:UserAdressEntity[]

   @OneToMany(()=>FeedBackEntity,(feed)=>feed.user)
   feedback:FeedBackEntity[]

   @OneToMany(()=>BasketEntity,(basket)=>basket.user)
   baskets:BasketEntity[]

   @OneToMany(()=>OrderEntity,(order)=>order.user)
   orders:OrderEntity[]

   @OneToMany(()=>PaymentEntity,(payment)=>payment.user)
   payment:PaymentEntity[]


   @Column({nullable:true})
   otpId:number
   @OneToOne(()=>OtpEntity,(otp)=>otp.user)
   @JoinColumn({name:"otpId"})
   otp:OtpEntity
}