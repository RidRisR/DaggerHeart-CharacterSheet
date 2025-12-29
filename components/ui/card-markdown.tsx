"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

interface CardMarkdownProps {
    children: string
    className?: string
}

/**
 * 统一的卡牌 Markdown 渲染组件
 *
 * 颜色方案：
 * - **粗体** → text-amber-700（琥珀色 #B45309）
 * - *斜体* → text-sky-700（天蓝色 #0369A1）
 * - ***粗斜体*** → text-red-900（深红色 #7F1D1D）
 */
export function CardMarkdown({ children, className = "" }: CardMarkdownProps) {
    return (
        <div className={className}>
            <ReactMarkdown
                components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 list-inside list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 list-inside list-decimal">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => {
                    // 检查子节点类型
                    const childArray = React.Children.toArray(children);
                    const hasEmElement = childArray.some(
                        child => React.isValidElement(child) && typeof child.type === 'function' && child.type.name === 'em'
                    );

                    if (hasEmElement) {
                        // *** 情况（虽然不会渲染，但保持一致）
                        return <strong className="font-bold italic text-red-900">{children}</strong>;
                    }
                    // ** 情况：琥珀色700
                    return <strong className="font-bold text-amber-700">{children}</strong>;
                },
                em: ({ children }) => {
                    const childArray = React.Children.toArray(children);
                    const hasStrongElement = childArray.some(
                        child => React.isValidElement(child) && typeof child.type === 'function' && child.type.name === 'strong'
                    );

                    if (hasStrongElement) {
                        // *** 的情况：em 包含 strong，深红900
                        const extractText = (child: any): string => {
                            if (typeof child === 'string') return child;
                            if (React.isValidElement(child) && (child.props as any).children) {
                                return React.Children.toArray((child.props as any).children).map(extractText).join('');
                            }
                            return '';
                        };
                        const textContent = childArray.map(extractText).join('');
                        return <span className="italic font-bold text-red-900">{textContent}</span>;
                    }
                    // * 情况：天蓝色
                    return <em className="italic text-sky-700">{children}</em>;
                },
                }}
                remarkPlugins={[remarkGfm, remarkBreaks]}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}
