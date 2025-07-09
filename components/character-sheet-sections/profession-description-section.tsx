import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { transformCustomSyntax } from '@/lib/md-component';
import { StandardCard } from '@/card/card-types';

interface ProfessionDescriptionSectionProps {
    description: string | undefined;
    card?: StandardCard;
    cardIndex?: number;
    deckType?: 'cards' | 'inventory_cards';
    updateCardValue?: (cardIndex: number, deckType: 'cards' | 'inventory_cards', key: string, value: any) => void;
}

const ProfessionDescriptionSection: React.FC<ProfessionDescriptionSectionProps> = ({
    description,
    card,
    cardIndex = 0,
    deckType = 'cards',
    updateCardValue
}) => {
    const transformedDescription = description ? transformCustomSyntax(description) : '';

    // 使用 useMemo 缓存 components 对象，避免每次渲染都重新创建
    const markdownComponents = useMemo(() => ({
        p: ({ children }: any) => <p className="first:mt-0 mb-0 mt-1">{children}</p>,
        ul: ({ children }: any) => <ul className="list-disc pl-4 mb-0">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-0">{children}</ol>,
        li: ({ children }: any) => <li className="mb-0.5 last:mb-0">{children}</li>,
        code({ node, className, children, ...props }: any) {
            const dataType = props['data-type'];
            const dataValue = props['data-value'];
            const dataKey = props['data-key'];

            if (dataType === 'input' || dataType === 'box' || dataType === 'checkbox') {
                // 获取当前值
                const currentValue = dataKey && card?.values ? card.values[dataKey] : undefined;

                if (dataType === 'input') {
                    const len = parseInt(dataValue as string, 10) || 8;
                    return (
                        <input
                            key={`${cardIndex}-${deckType}-${dataKey}`} // 添加稳定的key
                            type="text"
                            className="border-b border-black outline-none px-1 mx-1 bg-transparent"
                            style={{ width: `${len * 0.6}em` }}
                            value={currentValue || ''}
                            onChange={(e) => {
                                if (dataKey && updateCardValue) {
                                    updateCardValue(cardIndex, deckType, dataKey, e.target.value);
                                }
                            }}
                        />
                    );
                } else if (dataType === 'box') {
                    const size = parseInt(dataValue as string, 10) || 1;
                    const px = 8 * size;
                    const fontSize = 6 * size;
                    return (
                        <input
                            key={`${cardIndex}-${deckType}-${dataKey}`} // 添加稳定的key
                            type="text"
                            className="border border-black outline-none text-center mx-1 bg-transparent"
                            style={{ width: `${px}px`, height: `${px}px`, fontSize: `${fontSize}px` }}
                            value={currentValue || ''}
                            onChange={(e) => {
                                if (dataKey && updateCardValue) {
                                    updateCardValue(cardIndex, deckType, dataKey, e.target.value);
                                }
                            }}
                        />
                    );
                } else if (dataType === 'checkbox') {
                    const count = parseInt(dataValue as string, 10) || 1;
                    const selectedCount = typeof currentValue === 'number' ? currentValue : 0;

                    return (
                        <span className="inline-flex items-center">
                            {Array(count).fill(0).map((_, index) => (
                                <input
                                    key={`${cardIndex}-${deckType}-${dataKey}-${index}`} // 添加稳定的key
                                    type="checkbox"
                                    className="mx-0.5 align-middle w-3 h-3 appearance-none border border-black rounded-sm bg-white checked:bg-black checked:border-black focus:outline-none focus:ring-0"
                                    checked={index < selectedCount}
                                    onChange={(e) => {
                                        if (dataKey && updateCardValue) {
                                            // 计算新的选中数量
                                            let newSelectedCount;
                                            if (e.target.checked) {
                                                // 选中：确保这个和之前的都被选中
                                                newSelectedCount = index + 1;
                                            } else {
                                                // 取消选中：只保留这个之前的选中状态
                                                newSelectedCount = index;
                                            }
                                            updateCardValue(cardIndex, deckType, dataKey, newSelectedCount);
                                        }
                                    }}
                                />
                            ))}
                        </span>
                    );
                }
            }

            return (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        },
    }), [card?.values, cardIndex, deckType, updateCardValue]); // 依赖项

    return (
        <div className="border-2 border-gray-300 rounded-lg p-1 text-xs markdown-content h-[14rem] overflow-auto">
            <ReactMarkdown
                children={transformedDescription}
                rehypePlugins={[rehypeRaw]}
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={markdownComponents}
            />
        </div>
    );
};

export default ProfessionDescriptionSection;
