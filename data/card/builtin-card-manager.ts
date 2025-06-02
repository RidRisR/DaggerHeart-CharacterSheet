import type { StandardCard } from "@/data/card/card-types"
import { AncestryCard } from "@/data/card/ancestry-card/convert";
import { CommunityCard } from "@/data/card/community-card/convert";
import { DomainCard } from "@/data/card/domain-card/convert";
import { ProfessionCard } from "@/data/card/profession-card/convert";
import { SubClassCard } from "@/data/card/subclass-card/convert";

// 定义所有可用的卡牌类型映射
type CardTypeMap = {
    profession: ProfessionCard;
    ancestry: AncestryCard;
    community: CommunityCard;
    domain: DomainCard;
    subclass: SubClassCard;
}

export class BuiltinCardManager {
    private static instance: BuiltinCardManager
    private cardConverters: {
        [K in keyof CardTypeMap]?: (card: CardTypeMap[K]) => StandardCard
    } = {}

    private constructor() { }

    static getInstance(): BuiltinCardManager {
        if (!BuiltinCardManager.instance) {
            BuiltinCardManager.instance = new BuiltinCardManager()
        }
        return BuiltinCardManager.instance
    }

    registerConverter<T extends keyof CardTypeMap>(
        type: T,
        converter: (card: CardTypeMap[T]) => StandardCard
    ): void {
        this.cardConverters[type] = converter as (card: any) => StandardCard
    }

    registerCardType<T extends keyof CardTypeMap>(
        type: T,
        registration: {
            converter: (card: CardTypeMap[T]) => StandardCard;
        }
    ): void {
        this.registerConverter(type, registration.converter)
    }

    ConvertCard<T extends keyof CardTypeMap>(
        card: CardTypeMap[T],
        type: T
    ): StandardCard | null {
        const converter = this.cardConverters[type]
        if (converter) {
            try {
                var standCard = converter(card)
                standCard.standarized = true

                // 对 displayDescription 进行文本处理
                if (standCard.description) {
                    standCard.description = standCard.description
                        .replace(/\n/g, '\n\n')
                        .replace(/\n{2,}/g, '\n\n')
                        .replace(/(\n\n)(?=\s*[-*+] )/g, '\n');
                }

                return standCard
            } catch (error) {
                console.error(`使用${type}转换器转换卡牌失败:`, error, card)
                return null
            }
        }
        return null
    }

    getRegisteredTypes(): string[] {
        return Object.keys(this.cardConverters)
    }

    isTypeRegistered(type: string): boolean {
        return type in this.cardConverters
    }
}
