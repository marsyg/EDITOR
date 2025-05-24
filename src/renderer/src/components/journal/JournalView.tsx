
import React, { useState, useRef, useEffect } from "react";
import { BulletItemType, JournalImage, JournalVideo } from "../../types/journal";
import { Maximize, X } from "lucide-react";

interface JournalViewProps {
  content: {
    bullets?: BulletItemType[];
    images?: JournalImage[];
    videos?: JournalVideo[];
  };
  onDeleteImage?: (imageId: string, imageUrl: string) => void;
  onDeleteVideo?: (videoId: string, videoUrl: string) => void;
}

interface ResizeHandleProps {
  onResize: (e: React.MouseEvent) => void;
  onResizeEnd: () => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onResize, onResizeEnd }) => {
  return (
    <div 
      className="absolute bottom-0 right-0 w-4 h-4 bg-white border border-gray-300 rounded-tl cursor-se-resize flex items-center justify-center"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const handleMouseMove = (moveEvent: MouseEvent) => {
          onResize(moveEvent as unknown as React.MouseEvent);
        };
        
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          onResizeEnd();
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp, { once: true });
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 7L1 1M7 1L1 7" stroke="#666" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

const MediaWrapper: React.FC<{
  id: string;
  type: 'image' | 'video';
  src: string;
  width?: number;
  height?: number;
  onResize: (id: string, width: number, height?: number) => void;
  onDelete?: (id: string, url: string) => void;
}> = ({ id, type, src, width = 300, height, onResize, onDelete }) => {
  const [dimensions, setDimensions] = useState({
    width: width || (type === 'video' ? 400 : 300),
    height: height || 'auto' as number | 'auto',
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startWidth = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    setDimensions({
      width: width || (type === 'video' ? 400 : 300),
      height: height || 'auto',
    });
  }, [width, height, type]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startWidth.current = dimensions.width as number;
    startHeight.current = typeof dimensions.height === 'number' ? dimensions.height : startWidth.current * (9/16);
    
    document.body.style.userSelect = 'none';
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    
    const newWidth = Math.max(100, startWidth.current + deltaX);
    const newHeight = startHeight.current + deltaY;
    
    // Maintain aspect ratio if shift key is pressed
    const aspectRatio = startHeight.current / startWidth.current;
    
    setDimensions({
      width: newWidth,
      height: e.shiftKey ? newWidth * aspectRatio : newHeight
    });
  };

  const handleResizeEnd = () => {
    if (isResizing.current) {
      isResizing.current = false;
      document.body.style.userSelect = '';
      
      // Only call onResize when resizing is complete
      onResize(id, dimensions.width, dimensions.height === 'auto' ? undefined : dimensions.height);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleResize(e);
    const handleMouseUp = () => handleResizeEnd();

    if (isResizing.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dimensions]);

  return (
    <div 
      ref={containerRef}
      className="relative inline-block group"
      style={{
        width: dimensions.width,
        height: dimensions.height === 'auto' ? 'auto' : dimensions.height,
      }}
    >
      {type === 'image' ? (
        <img 
          src={src} 
          alt="" 
          className="rounded-md shadow-sm w-full h-full object-cover"
          style={{
            maxWidth: '100%',
          }}
        />
      ) : (
        <video 
          src={src} 
          controls
          className="rounded-md shadow-sm w-full h-full"
          style={{
            maxWidth: '100%',
            objectFit: 'contain',
          }}
        />
      )}
      
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black bg-opacity-20 transition-opacity rounded-md">
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <button
            className="bg-white p-1.5 rounded-full shadow hover:bg-gray-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Toggle fullscreen
              const elem = containerRef.current?.querySelector(type === 'image' ? 'img' : 'video');
              if (elem) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  elem.requestFullscreen().catch(err => {
                    console.error('Error attempting to enable fullscreen:', err);
                  });
                }
              }
            }}
          >
            <Maximize className="h-3.5 w-3.5 text-gray-700" />
          </button>
          {onDelete && (
            <button
              className="bg-white p-1.5 rounded-full shadow hover:bg-red-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
                  onDelete(id, src);
                }
              }}
            >
              <X className="h-3.5 w-3.5 text-red-600" />
            </button>
          )}
        </div>
      </div>
      
      <ResizeHandle 
        onResize={handleResize as any} 
        onResizeEnd={handleResizeEnd} 
      />
    </div>
  );
};

const JournalView: React.FC<JournalViewProps> = ({ content, onDeleteImage, onDeleteVideo }) => {
  const bullets = content?.bullets || [];
  const images = content?.images || [];
  const videos = content?.videos || [];
  
  const [mediaDimensions, setMediaDimensions] = useState<Record<string, {width?: number, height?: number}>>({});
  
  const handleResizeMedia = (id: string, width: number, height?: number) => {
    setMediaDimensions(prev => ({
      ...prev,
      [id]: { width, height }
    }));
  };

  // Function to render bullet items recursively
  const renderBullets = (items: BulletItemType[]) => {
    return (
      <ul className="list-none">
        {items.map((bullet) => {
          // Find any images associated with this bullet
          const bulletImages = images.filter(img => img.id.startsWith(bullet.id));
          
          return (
            <li key={bullet.id} className="mb-2">
              <div className="flex items-start">
                <div className="min-w-4 mt-1.5 mr-2">
                  {bullet.children.length > 0 ? (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  )}
                </div>
                <div className="flex-grow">
                  {/* Bullet content */}
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: bullet.content }}
                  />
                  
                  {/* Images associated with this bullet */}
                  {bulletImages.map((image) => (
                    <div key={image.id} className="mb-4">
                      <MediaWrapper
                        id={image.id}
                        type="image"
                        src={image.url}
                        width={mediaDimensions[image.id]?.width || image.width}
                        height={mediaDimensions[image.id]?.height || image.height}
                        onResize={handleResizeMedia}
                        onDelete={onDeleteImage}
                      />
                    </div>
                  ))}
                  
                  {/* Videos associated with this bullet */}
                  {videos
                    .filter(video => video.id.startsWith(bullet.id))
                    .map((video) => (
                      <div key={video.id} className="mb-4">
                        <MediaWrapper
                          id={video.id}
                          type="video"
                          src={video.url}
                          width={mediaDimensions[video.id]?.width || video.width}
                          height={mediaDimensions[video.id]?.height || video.height}
                          onResize={handleResizeMedia}
                          onDelete={onDeleteVideo}
                        />
                      </div>
                    ))}
                  
                  {/* Render children if not collapsed */}
                  {!bullet.isCollapsed && bullet.children.length > 0 && (
                    <div className="ml-6 mt-2">
                      {renderBullets(bullet.children)}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="journal-view prose prose-lg max-w-none">
      {bullets.length > 0 ? (
        renderBullets(bullets)
      ) : (
        <div className="text-gray-500 italic p-4">This journal is empty.</div>
      )}
    </div>
  );
};

export default JournalView;
