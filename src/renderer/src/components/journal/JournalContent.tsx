import React from "react";
import BulletItem from "../../components/BulletItem";
import { BulletItemProps } from "../../components/BulletItem";
import { BulletItemType, JournalImage, JournalVideo } from "../../types/journal";
import { Button } from "../../components/ui/button";
import { List, ListTree } from "lucide-react";

interface JournalContentProps {
  bullets: BulletItemType[];
  images: JournalImage[];
  videos: JournalVideo[];
  onUpdate: (id: string, content: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onAddBulletAfter: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onImageUpload: (id: string, file: File) => void;
  onVideoUpload: (id: string, file: File) => void;
  onDeleteImage?: (imageId: string, imageUrl: string) => void;
  onDeleteVideo?: (videoId: string, videoUrl: string) => void;
  onImageResize?: (id: string, width: number, height?: number, top?: number, left?: number) => void;
  onAddNewRootBullet?: () => void;
  onAddCollapsibleBullet?: (parentId?: string) => void;
  onOutdent?: (id: string) => void;
}

const JournalContent: React.FC<JournalContentProps> = ({
  bullets,
  images,
  videos,
  onUpdate,
  onAddChild,
  onDelete,
  onAddBulletAfter,
  onToggleCollapse,
  onImageUpload,
  onVideoUpload,
  onDeleteImage,
  onDeleteVideo,
  onImageResize,
  onAddNewRootBullet,
  onAddCollapsibleBullet,
  onOutdent
}) => {
  // Convert BulletItemType to BulletItemProps for each bullet
  const convertToBulletItemProps = (bullet: BulletItemType): BulletItemProps => {
    return {
      id: bullet.id,
      content: bullet.content,
      children: bullet.children.map(convertToBulletItemProps),
      level: bullet.level,
      isCollapsed: bullet.isCollapsed,
      onUpdate,
      onAddChild,
      onDelete,
      onAddBulletAfter,
      onToggleCollapse,
      onImageUpload,
      onVideoUpload,
      onDeleteImage,
      onDeleteVideo,
      images,
      videos,
      onImageResize,
      onAddCollapsibleBullet,
      onOutdent
    };
  };

  // Convert all bullets
  const bulletProps = bullets.map(convertToBulletItemProps);

  return (
    <div className="journal-content flex-1 overflow-y-auto px-2">
      {bulletProps.map((bullet) => (
        <BulletItem
          key={bullet.id}
          {...bullet}
          onVideoUpload={onVideoUpload}
          onDeleteImage={onDeleteImage}
          onDeleteVideo={onDeleteVideo}
          videos={videos}
          onOutdent={onOutdent}
        />
      ))}
      
      {bullets.length === 0 && (
        <div className="text-center text-gray-400 py-8 animate-fade-in">
          No content yet. Add a bullet to start writing.
        </div>
      )}
      
      {onAddNewRootBullet && onAddCollapsibleBullet && (
        <div className="flex justify-center gap-3 mt-6 animate-fade-in">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddNewRootBullet}
            className="flex items-center gap-1 hover:scale-105 transition-transform"
          >
            <List className="h-4 w-4" />
            <span>Add Bullet</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddCollapsibleBullet()}
            className="flex items-center gap-1 hover:scale-105 transition-transform"
          >
            <ListTree className="h-4 w-4" />
            <span>Add Section</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default JournalContent;
