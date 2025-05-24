import React from "react";
import { DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import JournalContent from "./JournalContent";
import JournalToolbar from "./JournalToolbar";
import { BulletItemType, JournalImage, JournalVideo } from "../../types/journal";

interface JournalFullscreenProps {
  title: string;
  setTitle: (title: string) => void;
  bullets: BulletItemType[];
  onUpdate: (id: string, content: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onAddBulletAfter: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onImageUpload: (id: string, file: File) => void;
  onImageResize: (imageId: string, width: number, height?: number, top?: number, left?: number) => void;
  onVideoUpload: (id: string, file: File) => void;
  onDeleteVideo: (videoId: string, videoUrl: string) => Promise<void>;
  onAddNewRootBullet: () => void;
  onAddCollapsibleBullet: () => void;
  images: JournalImage[];
  videos: JournalVideo[];
  setIsFullscreen: (isFullscreen: boolean) => void;
  onExport: () => void;
  onExportOPML: () => void;
  onPublish?: () => void;
  isPublished?: boolean;
  isSaving?: boolean;
  onDeleteJournal?: (journalId: string) => Promise<boolean>;
  lastSaved?: Date | null;
  onSave: () => void;
}

const JournalFullscreen: React.FC<JournalFullscreenProps> = ({
  title,
  setTitle,
  bullets,
  onUpdate,
  onAddChild,
  onDelete,
  onAddBulletAfter,
  onToggleCollapse,
  onImageUpload,
  onImageResize,
  onVideoUpload,
  onDeleteVideo,
  onAddNewRootBullet,
  onAddCollapsibleBullet,
  images,
  videos,
  setIsFullscreen,
  onExport,
  onExportOPML,
  onPublish,
  isPublished,
  isSaving,
  onDeleteJournal,
  lastSaved,
  onSave
}) => {
  return (
    <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-0 animate-fade-in shadow-xl border-gray-200">
      <DialogHeader className="p-4 border-b bg-gray-50">
        <DialogTitle className="sr-only">Journal Editor</DialogTitle>
        <JournalToolbar
          title={title}
          setTitle={setTitle}
          onExport={onExport}
          onExportOPML={onExportOPML}
          onClose={() => setIsFullscreen(false)}
          isFullscreen={true}
          onAddNewRootBullet={onAddNewRootBullet}
          onAddCollapsibleBullet={onAddCollapsibleBullet}
          onPublish={onPublish}
          isPublished={isPublished}
          isSaving={isSaving}
          onSave={onSave}
          lastSaved={lastSaved}
        />
      </DialogHeader>
      
      <div className="flex-1 overflow-auto p-8 bg-gray-50">
        <div className="journal-content bg-journal-background p-8 rounded-lg shadow-md transform perspective-1000 translate-y-0 min-h-full max-w-4xl mx-auto"
          style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.1), 0 6px 16px rgba(0,0,0,0.05)" }}>
          <JournalContent
            bullets={bullets}
            onUpdate={onUpdate}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onAddBulletAfter={onAddBulletAfter}
            onToggleCollapse={onToggleCollapse}
            onImageUpload={onImageUpload}
            onImageResize={onImageResize}
            onVideoUpload={onVideoUpload}
            onDeleteVideo={onDeleteVideo}
            onAddNewRootBullet={onAddNewRootBullet}
            onAddCollapsibleBullet={onAddCollapsibleBullet}
            images={images}
            videos={videos}
          />
        </div>
      </div>
    </DialogContent>
  );
};

export default JournalFullscreen;
