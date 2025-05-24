import React, { useState, useEffect } from "react";
import { Dialog } from "../components/ui/dialog";
import JournalCard from "./journal/JournalCard";
import JournalFullscreen from "./journal/JournalFullscreen";
import { useJournalState } from "../hooks/useJournalState";
import { JournalProps, BulletItemType, JournalImage } from "../types/journal";

interface EditorAccessProps {
  children: React.ReactNode;
}

const EditorAccess: React.FC<EditorAccessProps> = ({ children }) => {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(true);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "EDITOR") {
      setIsAuthorized(true);
      setShowPasswordModal(false);
    } else {
      alert("Incorrect password. Please try again.");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Editor Access Required</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Enter Editor Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Access Editor
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
};

const Journal: React.FC<JournalProps> = ({
  initialTitle = "My Journal",
  initialContent,
  journalId
}) => {
  console.log('Journal component rendered with:', { initialTitle, initialContent, journalId });
  
  const {
    title,
    setTitle,
    bullets: displayBullets = [],
    images,
    videos,
    isFullscreen,
    setIsFullscreen,
    isPublished,
    isSaving,
    isLocalSaving,
    lastSaved,
    handleUpdateBullet,
    handleAddChild,
    handleDeleteBullet,
    handleAddBulletAfter,
    handleToggleCollapse,
    handleImageUpload,
    handleImageResize,
    handleVideoUpload,
    deleteImage,
    deleteVideo,
    addNewRootBullet,
    addCollapsibleBullet,
    exportToJson,
    exportToOPML,
    saveJournalLocally,
    publishJournal,
    deleteJournal,
    loadJournal,
    handleOutdent,
  } = useJournalState(initialTitle, initialContent, journalId);

  // Keep the effect to handle title updates
  useEffect(() => {
    console.log('Setting title:', initialTitle);
    setTitle(initialTitle);
  }, [initialTitle]);

  // Add effect to handle journal ID changes
  useEffect(() => {
    if (journalId) {
      console.log('Journal ID changed:', journalId);
      loadJournal(journalId);
    }
  }, [journalId]);

  return (
   <>
      {/* Regular card view */}
      {!isFullscreen && (
        <JournalCard
          title={title}
          setTitle={setTitle}
          bullets={displayBullets}
          images={images}
          videos={videos}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          isPublished={isPublished}
          isSaving={isSaving}
          isLocalSaving={isLocalSaving}
          lastSaved={lastSaved}
          onUpdate={handleUpdateBullet}
          onAddChild={handleAddChild}
          onDelete={handleDeleteBullet}
          onAddBulletAfter={handleAddBulletAfter}
          onToggleCollapse={handleToggleCollapse}
          onImageUpload={handleImageUpload}
          onVideoUpload={handleVideoUpload}
          onImageResize={handleImageResize}
          addNewRootBullet={addNewRootBullet}
          addCollapsibleBullet={addCollapsibleBullet}
          exportToJson={exportToJson}
          exportToOPML={exportToOPML}
          onSave={saveJournalLocally}
          onPublish={publishJournal}
          onDeleteJournal={deleteJournal}
          onOutdent={handleOutdent}
          onDeleteImage={deleteImage}
          onDeleteVideo={deleteVideo}
          journalId={journalId}
        />
      )}

      {/* Fullscreen dialog mode */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <JournalFullscreen
          title={title}
          setTitle={setTitle}
          bullets={displayBullets}
          images={images}
          videos={videos}
          setIsFullscreen={setIsFullscreen}
          isPublished={isPublished}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onUpdate={handleUpdateBullet}
          onAddChild={handleAddChild}
          onDelete={handleDeleteBullet}
          onAddBulletAfter={handleAddBulletAfter}
          onToggleCollapse={handleToggleCollapse}
          onImageUpload={handleImageUpload}
          onVideoUpload={handleVideoUpload}
          onDeleteVideo={deleteVideo}
          onImageResize={handleImageResize}
          onAddNewRootBullet={addNewRootBullet}
          onAddCollapsibleBullet={addCollapsibleBullet}
          onExport={exportToJson}
          onExportOPML={exportToOPML}
          onSave={saveJournalLocally}
          onPublish={publishJournal}
          onDeleteJournal={deleteJournal}
        />
      </Dialog>
   </>
  );
};

export default Journal;
