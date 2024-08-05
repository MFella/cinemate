import { RateValue } from "@prisma/client";
import { Rate } from "../dtos/rate-of-movie";

export class PrismaUtil {
    static convertRateToRateValue(rate: Rate): RateValue {
        switch (rate) {
            case Rate.YES:
                return RateValue.YES;
            case Rate.NO:
                return RateValue.NO;
            case Rate.IDK:
                return RateValue.IDK;
            default:
                throw new Error(`Cannot recognize rate value: ${rate}`);
        }
    }
}
