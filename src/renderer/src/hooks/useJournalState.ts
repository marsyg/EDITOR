import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../hooks/use-toast';
import { generateSampleJournal } from '../utils/journalUtils';
import { BulletItemType, JournalImage, JournalVideo } from '../types/journal';
import { supabase } from '../integrations/supabase/client';
import { journalService } from '../services/journalService';

export const useJournalState = (
  initialTitle: string = 'My Journal',
  initialContent?: {
    bullets?: BulletItemType[];
    images?: JournalImage[];
    videos?: JournalVideo[];
  },
  journalId?: string
) => {
  const [title, setTitle] = useState(initialTitle);
  const [bullets, setBullets] = useState<BulletItemType[]>([]);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<JournalImage[]>([]);
  const [videos, setVideos] = useState<JournalVideo[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentJournalId, setCurrentJournalId] = useState<string | undefined>(journalId);
  const { toast } = useToast();

  // Reset function to clear all state
  const resetState = () => {
    setTitle('My Journal');
    setBullets([]);
    setCollapsedItems(new Set());
    setImages([]);
    setVideos([]);
    setIsFullscreen(false);
    setIsPublished(false);
    setIsSaving(false);
    setIsLocalSaving(false);
    setLastSaved(null);
  };

  // Add effect to handle content updates
  useEffect(() => {
    console.log('=== Content Update Effect ===');
    console.log('Initial content updated:', initialContent);
    
    if (initialContent) {
      if (initialContent.bullets && initialContent.bullets.length > 0) {
        console.log('Setting bullets from initial content:', initialContent.bullets);
        setBullets(initialContent.bullets);
        // Set collapsed state for bullets that were collapsed
        const newCollapsedItems = new Set<string>();
        const processBullets = (items: BulletItemType[]) => {
          items.forEach(item => {
            if (item.isCollapsed) {
              console.log('Found collapsed item in initial content:', item.id);
              newCollapsedItems.add(item.id);
            }
            if (item.children.length > 0) {
              processBullets(item.children);
            }
          });
        };
        processBullets(initialContent.bullets);
        console.log('Setting initial collapsed items:', Array.from(newCollapsedItems));
        setCollapsedItems(newCollapsedItems);
      } else {
        // If no bullets provided or empty array, initialize with empty array
        console.log('No bullets provided, initializing with empty array');
        setBullets([]);
      }
      if (initialContent.images) {
        console.log('Setting images from initial content:', initialContent.images);
        setImages(initialContent.images);
      } else {
        // If no images provided, initialize with an empty array
        setImages([]);
      }
      if (initialContent.videos) {
        console.log('Setting videos from initial content:', initialContent.videos);
        setVideos(initialContent.videos);
      } else {
        // If no images provided, initialize with an empty array
        setVideos([]);
      }
    } else {
      // If no initial content, initialize with empty arrays
      console.log('No initial content, initializing with empty arrays');
      setBullets([]);
      setCollapsedItems(new Set());
      setImages([]);
      setVideos([]);
    }
  }, [initialContent]);

  // Add effect to handle title updates
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  // Add effect to handle journal ID changes
  useEffect(() => {
    setCurrentJournalId(journalId);
  }, [journalId]);

  // Update a bullet's content
  const handleUpdateBullet = (id: string, content: string) => {
    console.log('Updating bullet content:', { id, content });

    const updateBulletInTree = (items: BulletItemType[]): BulletItemType[] => {
      // Always create a new array when mapping
      return items.map((item) => {
        if (item.id === id) {
          console.log('Found bullet to update:', item.id);
          // Create a new item object with updated content
          return { ...item, content };
        }

        // Create a shallow copy of the current item
        const newItem = { ...item };

        if (newItem.children.length > 0) {
          // Recursively update children and assign to a new children array
          newItem.children = updateBulletInTree(newItem.children);
        }

        return newItem;
      });
    };

    setBullets(prevBullets => {
      const updatedBullets = updateBulletInTree(prevBullets);
      console.log('Updated bullets after content change:', updatedBullets);
      return updatedBullets;
    });
  };

  // Add a child bullet to a parent
  const handleAddChild = (parentId: string) => {
    const addChildToParent = (items: BulletItemType[]): BulletItemType[] => {
      return items.map((item) => {
        if (item.id === parentId) {
          const newChild: BulletItemType = {
            id: uuidv4(),
            content: '',
            children: [],
            level: item.level + 1,
            isCollapsed: false,
          };
          return {
            ...item,
            children: [...item.children, newChild],
            isCollapsed: false,
          };
        }
        if (item.children.length > 0) {
          return {
            ...item,
            children: addChildToParent(item.children),
          };
        }
        return item;
      }); 
    };

    const updatedBullets = addChildToParent(bullets);
    setBullets(updatedBullets);

    // Ensure the parent is not collapsed
    setCollapsedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(parentId);
      return newSet;
    });

    toast({
      title: 'Added new nested item',
      description: 'New nested item has been added.',
      duration: 2000,
    });
  };

  // Delete a bullet
  const handleDeleteBullet = (id: string) => {
    // Helper function to filter out bullet with given id
    const filterBullet = (items: BulletItemType[]): BulletItemType[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          children: filterBullet(item.children),
        }));
    };

    setBullets(filterBullet(bullets));
  };

  // Add a new bullet after the current one
  const handleAddBulletAfter = (id: string) => {
    console.log('Adding bullet after:', id);
    
    // Helper function to find the parent of a bullet
    const findParentId = (
      items: BulletItemType[],
      targetId: string,
      parentId: string | null = null
    ): string | null => {
      for (const item of items) {
        if (item.id === targetId) {
          return parentId;
        }
        const foundParent = findParentId(item.children, targetId, item.id);
        if (foundParent) {
          return foundParent;
        }
      }
      return null;
    };

    // Helper function to insert a new bullet after the target
    const insertBulletAfter = (
      items: BulletItemType[],
      targetId: string,
      level: number
    ): BulletItemType[] => {
      const result: BulletItemType[] = [];

      for (let i = 0; i < items.length; i++) {
        result.push(items[i]);

        if (items[i].id === targetId) {
          // Insert new bullet after this one
          const newBullet: BulletItemType = {
            id: uuidv4(),
            content: '',
            children: [],
            level,
            isCollapsed: false,
          };
          console.log('Created new bullet:', newBullet);
          result.push(newBullet);
          // Do NOT continue processing children of this item for insertion after
          continue; // Move to the next item in the loop
        }

        if (items[i].children.length > 0) {
          // Recursively process children for insertion after the target
          result[i] = {
            ...result[i],
            children: insertBulletAfter(items[i].children, targetId, level + 1),
          };
        }
      }

      return result;
    };

    // Find the level of the current bullet
    const findLevel = (
      items: BulletItemType[],
      targetId: string
    ): number | null => {
      for (const item of items) {
        if (item.id === targetId) {
          return item.level;
        }
        const foundLevel = findLevel(item.children, targetId);
        if (foundLevel !== null) {
          return foundLevel;
        }
      }
      return null;
    };

    setBullets(prevBullets => {
      const level = findLevel(prevBullets, id) ?? 0;
      const parentId = findParentId(prevBullets, id);

      let updatedBullets;
      if (parentId) {
        const updateChildrenOfParent = (
          items: BulletItemType[]
        ): BulletItemType[] => {
          return items.map((item) => {
            if (item.id === parentId) {
              return {
                ...item,
                children: insertBulletAfter(item.children, id, level),
              };
            }
            return {
              ...item,
              children: updateChildrenOfParent(item.children),
            };
          });
        };

        updatedBullets = updateChildrenOfParent(prevBullets);
      } else {
        // Target bullet is at the root level
        updatedBullets = insertBulletAfter(prevBullets, id, level);
      }

      console.log('Updated bullets after adding new bullet:', updatedBullets);
      return updatedBullets;
    });
  };

  // Toggle collapse state of a bullet
  const handleToggleCollapse = (id: string) => {
    setCollapsedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Handle image upload for a specific bullet
  const handleImageUpload = async (bulletId: string, file: File) => {
    try {
      // Show loading toast
      toast({
        title: 'Uploading image...',
        description: 'Please wait while we upload your image.',
      });

      // Get current user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Authentication required');
      }

      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${bulletId}-${uuidv4()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('journal-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get the public URL for the uploaded image
      const {
        data: { publicUrl },
      } = supabase.storage.from('journal-images').getPublicUrl(filePath);

      // Add the image to our images array
      const imageId = `${bulletId}-${uuidv4()}`;
      setImages((prev) => [
        ...prev,
        {
          id: imageId,
          url: publicUrl,
          width: 300, // Default width
          height: undefined, // Auto height
        },
      ]);

      toast({
        title: 'Image uploaded',
        description: 'Image has been added to your journal entry.',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description:
          error.message || 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle video upload for a specific bullet
  const handleVideoUpload = async (bulletId: string, file: File) => {
    try {
      // Show loading toast
      toast({
        title: 'Uploading video...',
        description: 'Please wait while we upload your video.',
      });

      // Get current user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Authentication required');
      }


      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${bulletId}-${uuidv4()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('journal-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get the public URL for the uploaded video
      const {
        data: { publicUrl },
      } = supabase.storage.from('journal-videos').getPublicUrl(filePath);

      // Add the video to our videos array
      const videoId = `${bulletId}-${uuidv4()}`;
      setVideos((prev) => [
        ...prev,
        {
          id: videoId,
          url: publicUrl,
          width: 560, // Default width for videos (16:9 aspect ratio)
          height: 315, // Default height for videos (16:9 aspect ratio)
        },
      ]);

      toast({
        title: 'Video uploaded',
        description: 'Video has been added to your journal entry.',
      });
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast({
        title: 'Upload failed',
        description:
          error.message || 'Failed to upload video. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Delete an image from the journal and storage
  const deleteImage = async (imageId: string, imageUrl: string) => {
    try {
      // Remove from local state first for immediate UI update
      setImages(prev => prev.filter(img => img.id !== imageId));
      
      // Try to delete from storage
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Extract the file path from the URL
          const url = new URL(imageUrl);
          const pathParts = url.pathname.split('/');
          const bucket = pathParts[2]; // 'journal-images' or 'journal-videos'
          const filePath = pathParts.slice(3).join('/');
          
          await supabase.storage
            .from(bucket)
            .remove([filePath]);
        }
      } catch (storageError) {
        console.error('Error deleting image from storage:', storageError);
        // Continue even if storage deletion fails
      }
      
      toast({
        title: 'Image deleted',
        description: 'The image has been removed from your journal.',
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Failed to delete image',
        description: 'There was an error removing the image.',
        variant: 'destructive',
      });
    }
  };

  // Delete a video from the journal and storage
  const deleteVideo = async (videoId: string, videoUrl: string) => {
    try {
      // Remove from local state first for immediate UI update
      setVideos(prev => prev.filter(vid => vid.id !== videoId));
      
      // Try to delete from storage
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Extract the file path from the URL
          const url = new URL(videoUrl);
          const pathParts = url.pathname.split('/');
          const bucket = pathParts[2]; // 'journal-images' or 'journal-videos'
          const filePath = pathParts.slice(3).join('/');
          
          await supabase.storage
            .from(bucket)
            .remove([filePath]);
        }
      } catch (storageError) {
        console.error('Error deleting video from storage:', storageError);
        // Continue even if storage deletion fails
      }
      
      toast({
        title: 'Video deleted',
        description: 'The video has been removed from your journal.',
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Failed to delete video',
        description: 'There was an error removing the video.',
        variant: 'destructive',
      });
    }
  };

  // Handle image resizing
  const handleImageResize = (
    imageId: string,
    width: number,
    height?: number,
    top?: number,
    left?: number
  ) => {
    setImages((prevImages) =>
      prevImages.map((img) =>
        img.id === imageId ? { ...img, width, height, top, left } : img
      )
    );
  };

  // Add a new root-level bullet
  const addNewRootBullet = () => {
    console.log('Adding new root bullet');
    const newBullet: BulletItemType = {
      id: uuidv4(),
      content: '',
      children: [],
      level: 0,
      isCollapsed: false,
    };
    setBullets(prevBullets => {
      const updatedBullets = [...prevBullets, newBullet];
      console.log('Updated bullets after adding root bullet:', updatedBullets);
      return updatedBullets;
    });
  };

  // Find the level of a bullet
  const findLevel = (
    items: BulletItemType[],
    targetId: string
  ): number | null => {
    for (const item of items) {
      if (item.id === targetId) {
        return item.level;
      }
      const foundLevel = findLevel(item.children, targetId);
      if (foundLevel !== null) {
        return foundLevel;
      }
    }
    return null;
  };

  // Add a collapsible section
  const addCollapsibleBullet = (parentId?: string) => {
    // Helper function to create a completely new collapsible section structure
    const createNewCollapsibleSection = (level: number): BulletItemType => {
      const sectionId = uuidv4();
      const childId = uuidv4();

      const newSection: BulletItemType = {
        id: sectionId,
        content: 'New section',
        level: level,
        isCollapsed: false,
        children: [
          {
            id: childId,
            content: '',
            level: level + 1,
            isCollapsed: false,
            children: [],
          },
        ],
      };
      return newSection;
    };

    // Helper function to insert the new section into the bullet tree
    const insertSectionIntoTree = (
      items: BulletItemType[],
      targetParentId: string,
      sectionToInsert: BulletItemType
    ): BulletItemType[] => {
      return items.map(item => {
        // Create a shallow copy of the current item to maintain immutability
        const newItem = { ...item };

        if (newItem.id === targetParentId) {
          // Found the parent, add the new section to its children
          // Create a new children array with the new section added
          newItem.children = [...newItem.children, sectionToInsert];
          // Ensure the parent is not collapsed when adding a child section
          newItem.isCollapsed = false; // Automatically uncollapse parent
        } else if (newItem.children.length > 0) {
          // Recursively process children if not the target parent
          // Assign the result of the recursive call to a new children array
          const updatedChildren = insertSectionIntoTree(
            newItem.children,
            targetParentId,
            sectionToInsert
          );
          // Only update children if the recursive call resulted in a change
          if (updatedChildren !== newItem.children) {
             newItem.children = updatedChildren;
          }
        }
        return newItem;
      });
    };

    const newSection = createNewCollapsibleSection(parentId ? findLevel(bullets, parentId) + 1 : 0); // Determine level based on parent or root

    setBullets(prevBullets => {
      if (!parentId) {
        // Add a new root-level collapsible section
        const updatedBullets = [...prevBullets, newSection];
        console.log('Added new root-level collapsible section:', updatedBullets);
        return updatedBullets;
      } else {
        // Add as a child of the specified parent
        const updatedBullets = insertSectionIntoTree(
          prevBullets,
          parentId,
          newSection
        );
        console.log('Added nested collapsible section:', updatedBullets);
        return updatedBullets;
      }
    });

    // Ensure the parent is not collapsed globally after the state update (redundant with insertSectionIntoTree but kept for safety)
    if (parentId) {
       setCollapsedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    }

    toast({
      title: 'Collapsible section created',
      description: 'You can now add content to your new section.',
      duration: 2000,
    });
  };

  // Export functions
  const exportToJson = () => {
    const simplifyBullet = (bullet: BulletItemType) => {
      return {
        id: bullet.id,
        content: bullet.content,
        children: bullet.children.map(simplifyBullet),
        isCollapsed: collapsedItems.has(bullet.id),
      };
    };

    const data = {
      title,
      bullets: bullets.map(simplifyBullet),
      images: images,
      videos: videos,
      timestamp: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute(
      'download',
      `${title.replace(/\s+/g, '-').toLowerCase()}.json`
    );
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);

    toast({
      title: 'Journal exported',
      description: 'Your journal has been exported as JSON.',
    });
  };

  const exportToOPML = () => {
    const buildOutline = (bullet: BulletItemType): string => {
      let outlineContent = `<outline text="${escapeXml(bullet.content)}"`;

      if (bullet.children.length > 0) {
        outlineContent += `>\n`;
        bullet.children.forEach((child) => {
          outlineContent += buildOutline(child);
        });
        outlineContent += `</outline>\n`;
      } else {
        outlineContent += `/>\n`;
      }

      return outlineContent;
    };

    const escapeXml = (unsafe: string): string => {
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
${bullets.map(buildOutline).join('')}
  </body>
</opml>`;

    const dataUri = `data:text/xml;charset=utf-8,${encodeURIComponent(
      opmlContent
    )}`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute(
      'download',
      `${title.replace(/\s+/g, '-').toLowerCase()}.opml`
    );
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);

    toast({
      title: 'Journal exported',
      description: 'Your journal has been exported as OPML.',
    });
  };

  // Local save function
  const saveJournalLocally = async () => {
    try {
      setIsLocalSaving(true);
      console.log('Starting local save...');
      
      const simpleBullets = bullets.map((bullet) => ({
        id: bullet.id,
        content: bullet.content,
        children: bullet.children,
        isCollapsed: collapsedItems.has(bullet.id),
      }));
      console.log('Processed bullets:', simpleBullets);

      const simpleImages = images.map((img) => ({
        id: img.id,
        url: img.url,
        width: img.width,
        height: img.height,
        top: img.top,
        left: img.left,
      }));
      console.log('Processed images:', simpleImages);

      const simpleVideos = videos.map((video) => ({
        id: video.id,
        url: video.url,
        width: video.width,
        height: video.height,
        top: video.top,
        left: video.left,
      }));
      console.log('Processed videos:', simpleVideos);

      const contentObject = {
        bullets: simpleBullets,
        images: simpleImages,
        videos: simpleVideos,
      };
      console.log('Content object prepared:', contentObject);

      const journalData = {
        id: currentJournalId || uuidv4(), // Use current journal ID if available, otherwise create new
        title,
        content: JSON.stringify(contentObject),
      };
      console.log('Journal data prepared:', journalData);

      const result = await journalService.autoSaveJournal(journalData);
      console.log('Save result:', result);

      setLastSaved(new Date());
      toast({
        title: 'Journal saved',
        description: 'Your journal has been saved locally.',
      });
    } catch (error) {
      console.error('Error saving journal locally:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      toast({
        title: 'Failed to save',
        description: 'There was an error saving your journal locally.',
        variant: 'destructive',
      });
    } finally {
      setIsLocalSaving(false);
    }
  };

  // Auto-save function
  // const autoSave = async () => {
  //   if (title || bullets.length > 0) {
  //     await saveJournalLocally();
  //   }
  // };

  // Set up auto-save interval
  // useEffect(() => {
  //   const autoSaveInterval = setInterval(autoSave, 30000); // Auto-save every 30 seconds
  //   return () => clearInterval(autoSaveInterval);
  // }, [title, bullets, images]);

  // Publish to Supabase (only when explicitly requested)
  const publishJournal = async () => {
    try {
      setIsSaving(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to publish your journal.',
          variant: 'destructive',
        });
        return;
      }

      const simpleBullets = bullets.map((bullet) => ({
        id: bullet.id,
        content: bullet.content,
        children: bullet.children,
        isCollapsed: collapsedItems.has(bullet.id),
      }));

      const simpleImages = images.map((img) => ({
        id: img.id,
        url: img.url,
        width: img.width,
        height: img.height,
        top: img.top,
        left: img.left,
      }));

      const simpleVideos = videos.map((video) => ({
        id: video.id,
        url: video.url,
        width: video.width,
        height: video.height,
        top: video.top,
        left: video.left,
      }));

      const contentObject = {
        bullets: simpleBullets,
        images: simpleImages,
        videos: simpleVideos,
      };

      const { error } = await supabase.from('journals').insert({
        title,
        content: contentObject,
        user_id: session.user.id,
      });

      if (error) throw error;

      setIsPublished(true);
      toast({
        title: 'Journal published',
        description: 'Your journal has been published successfully.',
      });
    } catch (error) {
      console.error('Error publishing journal:', error);
      toast({
        title: 'Failed to publish',
        description: 'There was an error publishing your journal.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete journal from Supabase
  const deleteJournal = async (journalId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to delete your journal.',
          variant: 'destructive',
        });
        return;
      }

      // First delete associated comments
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('journal_id', journalId);

      if (commentsError) {
        console.error('Error deleting comments:', commentsError);
      }

      // Then delete the journal
      const { error } = await supabase
        .from('journals')
        .delete()
        .eq('id', journalId)
        .eq('user_id', session.user.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Journal deleted',
        description: 'Your journal has been deleted successfully.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting journal:', error);
      toast({
        title: 'Failed to delete',
        description: 'There was an error deleting your journal.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const mapBulletsWithCollapseState = (
    items: BulletItemType[]
  ): BulletItemType[] => {
    return items.map((item) => ({
      ...item,
      isCollapsed: collapsedItems.has(item.id),
      children: mapBulletsWithCollapseState(item.children),
    }));
  };

  const displayBullets = mapBulletsWithCollapseState(bullets);

  // Add function to load journal content
  const loadJournal = async (journalId: string) => {
    try {
      console.log('=== Starting Journal Load ===');
      console.log('Loading journal with ID:', journalId);
      
      const journal = await journalService.getJournal(journalId);
      console.log('Raw journal data from service:', journal);

      if (!journal) {
        console.error('No journal data returned from service');
        toast({
          title: 'Failed to load',
          description: 'No journal data found.',
          variant: 'destructive',
        });
        return;
      }

      // Set title first
      setTitle(journal.title || 'Untitled Journal');

      // Parse the content string from the database
      let content;
      try {
        console.log('Raw content from database:', journal.content);
        content = typeof journal.content === 'string' 
          ? JSON.parse(journal.content)
          : journal.content;
        console.log('Parsed journal content:', content);
      } catch (e) {
        console.error('Error parsing journal content:', e);
        console.error('Content that failed to parse:', journal.content);
        toast({
          title: 'Warning',
          description: 'Some journal content could not be loaded properly.',
          variant: 'destructive',
        });
        content = { bullets: [], images: [], videos: [] };
      }

      // Update bullets and their collapse state
      if (content.bullets && Array.isArray(content.bullets)) {
        console.log('Setting bullets:', content.bullets);
        
        // Process bullets to ensure proper structure
        const processBullets = (items: BulletItemType[]): BulletItemType[] => {
          return items.map(item => {
            // Ensure each bullet has the required properties
            const processedItem: BulletItemType = {
              id: item.id,
              content: item.content || '',
              level: item.level || 0,
              children: item.children ? processBullets(item.children) : [],
              isCollapsed: item.isCollapsed || false
            };
            return processedItem;
          });
        };

        const processedBullets = processBullets(content.bullets);
        console.log('Processed bullets:', processedBullets);
        setBullets(processedBullets);
        
        // Set collapsed items
        const newCollapsedItems = new Set<string>();
        const processCollapsedState = (items: BulletItemType[]) => {
          items.forEach(item => {
            if (item.isCollapsed) {
              console.log('Found collapsed item:', item.id);
              newCollapsedItems.add(item.id);
            }
            if (item.children && item.children.length > 0) {
              processCollapsedState(item.children);
            }
          });
        };
        processCollapsedState(processedBullets);
        console.log('Setting collapsed items:', Array.from(newCollapsedItems));
        setCollapsedItems(newCollapsedItems);
      } else {
        console.warn('No valid bullets found in content');
        setBullets([]);
      }

      // Update images
      if (content.images && Array.isArray(content.images)) {
        console.log('Setting images:', content.images);
        setImages(content.images);
      } else {
        console.warn('No valid images found in content');
        setImages([]);
      }

      // Update videos
      if (content.videos && Array.isArray(content.videos)) {
        console.log('Setting videos:', content.videos);
        setVideos(content.videos);
      } else {
        console.warn('No valid videos found in content');
        setVideos([]);
      }

      console.log('=== Journal Load Complete ===');
      toast({
        title: 'Journal loaded',
        description: 'Your journal has been loaded successfully.',
      });
    } catch (error) {
      console.error('=== Journal Load Error ===');
      console.error('Error loading journal:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        journalId
      });
      toast({
        title: 'Failed to load',
        description: 'There was an error loading your journal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Add effect to log state changes
  useEffect(() => {
    console.log('=== State Update ===');
    console.log('Current state:', {
      title,
      bulletsCount: bullets.length,
      imagesCount: images.length,
      videosCount: videos.length,
      collapsedItemsCount: collapsedItems.size,
      isFullscreen,
      isPublished,
      isSaving,
      isLocalSaving,
      lastSaved
    });
  }, [title, bullets, images, videos, collapsedItems, isFullscreen, isPublished, isSaving, isLocalSaving, lastSaved]);

  // Handle outdenting a bullet (Shift+Tab)
  const handleOutdent = (id: string) => {
    const findBulletAndParent = (
      items: BulletItemType[],
      targetId: string,
      parent: BulletItemType | null = null
    ): { bullet: BulletItemType | null; parent: BulletItemType | null } => {
      for (const item of items) {
        if (item.id === targetId) {
          return { bullet: item, parent };
        }
        if (item.children.length > 0) {
          const result = findBulletAndParent(item.children, targetId, item);
          if (result.bullet) {
            return result;
          }
        }
      }
      return { bullet: null, parent: null };
    };

    const removeBulletFromParent = (
      items: BulletItemType[],
      targetId: string
    ): BulletItemType[] => {
      return items.map(item => {
        if (item.children.length > 0) {
          return {
            ...item,
            children: removeBulletFromParent(item.children, targetId)
          };
        }
        return item;
      }).filter(item => item.id !== targetId);
    };

    setBullets(prevBullets => {
      // Find the bullet to outdent and its parent
      const { bullet, parent } = findBulletAndParent(prevBullets, id);
      
      // If no bullet found or it's already at root level, return unchanged
      if (!bullet || !parent) {
        return prevBullets;
      }

      // Create the outdented bullet with updated level
      const outdentedBullet = {
        ...bullet,
        level: bullet.level - 1,
        children: bullet.children.map(child => ({
          ...child,
          level: child.level - 1
        }))
      };

      // Remove the bullet from its current parent
      const withoutBullet = removeBulletFromParent(prevBullets, id);

      // Insert the outdented bullet after its parent in the parent's children array
      const insertAfterParent = (items: BulletItemType[]): BulletItemType[] => {
        return items.reduce<BulletItemType[]>((acc, item) => {
          acc.push(item);
          if (item.id === parent.id) {
            // Insert the outdented bullet after the parent
            acc.push(outdentedBullet);
          } else if (item.children.length > 0) {
            // Recursively process children
            acc[acc.length - 1] = {
              ...item,
              children: insertAfterParent(item.children)
            };
          }
          return acc;
        }, []);
      };

      return insertAfterParent(withoutBullet);
    });
  };

  return {
    title,
    setTitle,
    bullets: displayBullets,
    images,
    videos,
    isFullscreen,
    setIsFullscreen,
    isPublished,
    isSaving,
    isLocalSaving,
    lastSaved,
    currentJournalId,
    collapsedItems,
    handleUpdateBullet,
    handleAddChild,
    handleDeleteBullet,
    handleAddBulletAfter,
    handleToggleCollapse,
    handleImageUpload,
    handleVideoUpload,
    handleImageResize,
    deleteImage,
    deleteVideo,
    addNewRootBullet,
    addCollapsibleBullet,
    handleOutdent,
    exportToJson,
    exportToOPML,
    saveJournalLocally,
    publishJournal,
    deleteJournal,
    loadJournal,
    resetState,
  };
};
