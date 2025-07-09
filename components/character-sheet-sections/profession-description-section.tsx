import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { transformCustomSyntax } from '@/lib/md-component';

interface ProfessionDescriptionSectionProps {
    description: string | undefined;
}

const ProfessionDescriptionSection: React.FC<ProfessionDescriptionSectionProps> = ({ description }) => {
    const transformedDescription = description ? transformCustomSyntax(description) : '';

    return (
        <div className="border-2 border-gray-300 rounded-lg p-1.5 text-xs markdown-content h-[14rem] overflow-auto">
            <ReactMarkdown
                children={transformedDescription}
                rehypePlugins={[rehypeRaw]}
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                    p: ({ children }) => <p className="first:mt-0 mb-0 mt-1">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-0">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-0">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                    code({ node, className, children, ...props }) {
                        const dataType = (props as any)['data-type'];
                        const dataValue = (props as any)['data-value'];

                        if (dataType === 'input' || dataType === 'box' || dataType === 'checkbox') {
                            if (dataType === 'input') {
                                const len = parseInt(dataValue as string, 10) || 8;
                                return <input type="text" className="border-b border-black outline-none px-1 mx-1 bg-transparent" style={{ width: `${len * 0.6}em` }} />;
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
            />
        </div>
    );
};

export default ProfessionDescriptionSection;
