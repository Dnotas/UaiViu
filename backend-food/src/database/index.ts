import { Sequelize } from "sequelize-typescript";
import FoodRestaurantConfig from "../models/FoodRestaurantConfig";
import FoodWhatsapp from "../models/FoodWhatsapp";
import FoodMenuGroup from "../models/FoodMenuGroup";
import FoodMenuItem from "../models/FoodMenuItem";
import FoodOrder from "../models/FoodOrder";
import FoodOrderItem from "../models/FoodOrderItem";
import FoodPaymentConfig from "../models/FoodPaymentConfig";
import FoodConversation from "../models/FoodConversation";
import FoodMessage from "../models/FoodMessage";
import FoodItemComplement from "../models/FoodItemComplement";
import FoodCustomer from "../models/FoodCustomer";

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  models: [
    FoodRestaurantConfig,
    FoodWhatsapp,
    FoodMenuGroup,
    FoodMenuItem,
    FoodOrder,
    FoodOrderItem,
    FoodPaymentConfig,
    FoodConversation,
    FoodMessage,
    FoodItemComplement,
    FoodCustomer
  ]
});

export const initDB = async () => {
  await sequelize.authenticate();
};

export default sequelize;
