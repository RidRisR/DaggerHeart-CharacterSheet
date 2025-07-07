import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface ProfessionDescriptionSectionProps {
    description: string | undefined;
}

const ProfessionDescriptionSection: React.FC<ProfessionDescriptionSectionProps> = ({ description }) => {
    if (!description) {
        return null;
    }

    return (
        <div className="border-2 border-gray-300 rounded-lg p-2 text-xs markdown-content h-64">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                    p: ({ children }) => <p className="first:mt-0 mb-0 mt-0.5">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-0">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-0">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                }}
            >
                {description}
            </ReactMarkdown>
        </div>
    );
};

export default ProfessionDescriptionSection;
