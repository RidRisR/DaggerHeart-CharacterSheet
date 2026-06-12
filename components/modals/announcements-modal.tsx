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
      <DialogContent className="max-h-[85vh] max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>更新公告</DialogTitle>
          <DialogDescription>按发布时间倒序排列，最近更新在最上方。</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-1">
          {sortedAnnouncements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无更新公告</p>
          ) : (
            <div className="space-y-8">
              {sortedAnnouncements.map((announcement) => (
                <article key={announcement.id} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="mb-1 text-xl font-semibold tracking-normal text-gray-950">
                    {announcement.title}
                  </h3>
                  <p className="mb-4 text-xs font-medium text-muted-foreground">{announcement.date}</p>
                  <MarkdownGuide
                    content={announcement.content}
                    headingIdPrefix={`announcement-${announcement.id}`}
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
