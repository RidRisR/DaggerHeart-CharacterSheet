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
        <div className="border-2 border-gray-300 rounded-lg p-2 text-xs markdown-content">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                    p: ({ node, ...props }) => <p className="mb-1" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside" {...props} />,
                    li: ({ node, ...props }) => <li className="ml-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                    em: ({ node, ...props }) => <em className="italic" {...props} />,
                    thead: ({ node, ...props }) => <thead className="bg-gray-200" {...props} />,
                    tbody: ({ node, ...props }) => <tbody {...props} />,
                }}
            >
                {description}
            </ReactMarkdown>
        </div>
    );
};

export default ProfessionDescriptionSection;
