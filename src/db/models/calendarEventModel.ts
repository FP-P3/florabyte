import { ObjectId } from "mongodb";
import { db } from "../config/mongodb";

export type CalendarEventDoc = {
  _id?: ObjectId;
  userId: string;
  plantId: string;
  calendarId: string; // usually 'primary'
  eventId: string;
  type: string; // water | inspect | ...
  recurrence?: string[]; // e.g., ["RRULE:FREQ=DAILY;INTERVAL=7"]
  createdAt: Date;
};

export class CalendarEventModel {
  static collection() {
    return db.collection<CalendarEventDoc>("CalendarEvents");
  }

  static async addEvent(doc: Omit<CalendarEventDoc, "_id">) {
    return this.collection().insertOne(doc);
  }

  static async findByPlant(userId: string, plantId: string) {
    return this.collection().find({ userId, plantId }).toArray();
  }

  static async deleteById(_id: ObjectId) {
    return this.collection().deleteOne({ _id });
  }

  static async deleteByPlant(userId: string, plantId: string) {
    return this.collection().deleteMany({ userId, plantId });
  }
}
