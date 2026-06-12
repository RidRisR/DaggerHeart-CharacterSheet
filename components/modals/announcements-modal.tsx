"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MarkdownGuide } from "@/components/guides/markdown-guide"
import { getSortedAnnouncements, type Announcement } from "@/lib/announcements"

interface AnnouncementsModalProps {
  isOpen: boolean
  onClose: () => void
  announcements: readonly Announcement[]
}

export function AnnouncementsModal({
  isOpen,
  onClose,
  announcements,
}: AnnouncementsModalProps) {
  const sortedAnnouncements = getSortedAnnouncements(announcements)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>更新公告</DialogTitle>
          <DialogDescription>按发布时间倒序排列，最近更新在最上方。</DialogDescription>
        </DialogHeader>

        <div data-testid="announcements-scroll-region" className="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          {sortedAnnouncements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无更新公告</p>
          ) : (
            <div className="space-y-4">
              {sortedAnnouncements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-lg font-semibold tracking-normal text-gray-950">
                      {announcement.title}
                    </h3>
                    <p className="inline-flex w-fit shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {announcement.date}
                    </p>
                  </header>
                  <div className="border-t border-slate-100 pt-4">
                    <MarkdownGuide
                      content={announcement.content}
                      headingIdPrefix={`announcement-${announcement.id}`}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
