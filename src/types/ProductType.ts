import { ObjectId } from "mongodb";

export type ProductType = {
  _id: string | ObjectId;
  name: string;
  description: string;
  price: number;
  stock: number;
  imgUrl: string;
  category: string;
  embedding?: number[];
  createdAt?: Date;
  updatedAt?: Date;
};
