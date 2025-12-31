import React from 'react';
import rehypeRaw from 'rehype-raw';
import { transformCustomSyntax } from '@/lib/md-component';
import { CardMarkdown } from '@/components/ui/card-markdown';

interface ProfessionDescriptionSectionProps {
    description: string | undefined;
}

const ProfessionDescriptionSection: React.FC<ProfessionDescriptionSectionProps> = ({ description }) => {
    const transformedDescription = description ? transformCustomSyntax(description) : '';

    return (
        <div className="border-2 border-gray-300 rounded-lg p-1.5 text-xs markdown-content h-[250px] overflow-auto">
            <CardMarkdown
                rehypePlugins={[rehypeRaw]}
                customComponents={{
                    p: ({ children }) => <p className="first:mt-0 mb-0 mt-1">{children}</p>,
                    li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                    strong: ({ children }) => {
                        // 检查是否包含 em 元素（*** 的情况）
                        const childArray = React.Children.toArray(children);
                        const hasEmElement = childArray.some(
                            child => React.isValidElement(child) && typeof child.type === 'function' && child.type.name === 'em'
                        );
                        if (hasEmElement) {
                            // *** 情况：斜体加粗，不加直角引号
                            return <strong className="font-bold italic text-gray-800">{children}</strong>;
                        }
                        // ** 情况：标准加粗
                        return <strong className="font-bold text-gray-800">{children}</strong>;
                    },
                    em: ({ children }) => {
                        // 检查是否包含 strong 元素（*** 的情况）
                        const childArray = React.Children.toArray(children);
                        const hasStrongElement = childArray.some(
                            child => React.isValidElement(child) && typeof child.type === 'function' && child.type.name === 'strong'
                        );
                        if (hasStrongElement) {
                            // *** 的情况：提取文本内容，斜体加粗不加引号
                            const extractText = (child: any): string => {
                                if (typeof child === 'string') return child;
                                if (React.isValidElement(child) && (child.props as any).children) {
                                    return React.Children.toArray((child.props as any).children).map(extractText).join('');
                                }
                                return '';
                            };
                            const textContent = childArray.map(extractText).join('');
                            return <span className="font-bold italic text-gray-800">{textContent}</span>;
                        }
                        // * 情况：琥珀色直角引号
                        return <span className="text-amber-800">「{children}」</span>;
                    },
                    code({ node, className, children, ...props }) {
                        const dataType = (props as any)['data-type'];
                        const dataValue = (props as any)['data-value'];

                        if (dataType === 'input' || dataType === 'box' || dataType === 'checkbox') {
                            if (dataType === 'input') {
                                const len = parseInt(dataValue as string, 10) || 8;
                                return <input type="text" className="border-b border-black outline-none px-1 mx-1 bg-transparent" style={{ width: `${len * 9.6}px` }} />;
                            } else if (dataType === 'box') {
                                const size = parseInt(dataValue as string, 10) || 1;
                                const px = 8 * size;
                                const fontSize = 6 * size; // 基础12px，随size增大
                                return <input type="text" className="border border-black outline-none text-center mx-1 bg-transparent" style={{ width: `${px}px`, height: `${px}px`, fontSize: `${fontSize}px` }} />;
                            } else if (dataType === 'checkbox') {
                                const count = parseInt(dataValue as string, 10) || 1;
                                return (
                                    <span className="inline-flex items-center">
                                        {Array(count).fill(0).map((_, index) => (
                                            <input
                                                key={index}
                                                type="checkbox"
                                                className="mx-0.5 align-middle w-3 h-3 appearance-none border border-black rounded-sm bg-white checked:bg-black checked:border-black focus:outline-none focus:ring-0"
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
                }}
            >
                {transformedDescription}
            </CardMarkdown>
        </div>
    );
};

export default ProfessionDescriptionSection;
