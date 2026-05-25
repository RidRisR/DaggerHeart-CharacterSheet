import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  applyHeadingIdPrefix,
  generateHeadingId,
  plainTextFromReactNode,
} from "@/components/guides/markdown-heading-utils"

interface MarkdownGuideProps {
  content: string
  headingIdPrefix?: string
}

const slugifyHeading = (children: React.ReactNode, idPrefix?: string): string =>
  applyHeadingIdPrefix(generateHeadingId(plainTextFromReactNode(children)), idPrefix)

export function MarkdownGuide({ content, headingIdPrefix }: MarkdownGuideProps) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              id={slugifyHeading(children, headingIdPrefix)}
              className="text-3xl font-bold mb-8 mt-12 text-gray-900 pb-4 border-b-2 border-gray-300 scroll-mt-6"
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              id={slugifyHeading(children, headingIdPrefix)}
              className="text-2xl font-bold mb-6 mt-10 text-gray-900 bg-blue-50 px-4 py-3 rounded-md border-l-4 border-blue-500 border-b-2 border-b-blue-200 shadow-sm scroll-mt-6"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={slugifyHeading(children, headingIdPrefix)}
              className="text-xl font-semibold mb-4 mt-8 text-gray-800 bg-gray-50 px-3 py-2 rounded border-l-4 border-gray-400 scroll-mt-6"
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              id={slugifyHeading(children, headingIdPrefix)}
              className="text-lg font-medium mb-3 mt-6 text-gray-700 bg-gray-100 px-2 py-1.5 rounded border-l-2 border-gray-400 scroll-mt-6"
            >
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5
              id={slugifyHeading(children, headingIdPrefix)}
              className="text-base font-medium mb-2 mt-4 text-gray-600 pl-3 border-l-2 border-gray-200 scroll-mt-6"
            >
              {children}
            </h5>
          ),
          p: ({ children }) => <p className="mb-3 text-gray-600 leading-relaxed">{children}</p>,
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-")
            if (isBlock) {
              return (
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  <code className={className}>{children}</code>
                </pre>
              )
            }
            return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 my-4 italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-300">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-medium text-left">{children}</th>,
          td: ({ children }) => <td className="border border-gray-300 px-3 py-2">{children}</td>,
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("#") ? undefined : "_blank"}
              rel={href?.startsWith("#") ? undefined : "noopener noreferrer"}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
