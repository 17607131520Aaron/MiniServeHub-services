import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Column as OrmColumn } from 'typeorm';

@Entity('user_wx')
export class UserWx {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({
    type: 'varchar',
    length: 64,
    unique: true,
    comment: '微信小程序 openid',
  })
  public openid: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '微信 unionid（同主体下统一标识）',
  })
  public unionid: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '最近一次登录的 session_key（可选存储）',
  })
  public sessionKey: string | null;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '昵称',
  })
  public nickname: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '头像地址',
  })
  public avatarUrl: string | null;

  @Column({
    type: 'tinyint',
    nullable: true,
    comment: '性别：0-未知 1-男 2-女',
  })
  public gender: number | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '国家',
  })
  public country: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '省份',
  })
  public province: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '城市',
  })
  public city: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
    comment: '语言',
  })
  public language: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '绑定手机号（脱敏/加密后存储为宜）',
  })
  public phoneNumber: string | null;

  @OrmColumn({
    type: 'int',
    nullable: true,
    comment: '主用户ID（与 users 表关联）',
  })
  public userId: number | null;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '状态：1-启用 0-禁用',
  })
  public status: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '最后登录时间',
  })
  public lastLoginAt: Date | null;

  @CreateDateColumn({
    comment: '创建时间',
  })
  public createdAt: Date;

  @UpdateDateColumn({
    comment: '更新时间',
  })
  public updatedAt: Date;
}
