import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '..//components/ui/card';
import Journal from '..//components/Journal';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '..//integrations/supabase/client';
import { useToast } from '..//hooks/use-toast';
import { Input } from '..//components/ui/input';
import { Textarea } from '..//components/ui/textarea';
import {
  Loader2,
  Edit,
  MessageCircle,
  Share2,
  Heart,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '..//components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { User } from '@supabase/supabase-js';
import { generateSampleJournal } from '../utils/journalUtils';

interface JournalCard {
  id: string;
  title: string;
  lastEdited: Date;
  user_id?: string;
  username?: string;
  published?: boolean;
  likes?: number;
  comments?: number;
  author_name?: string;
  content?: {
    bullets?: any[];
    images?: any[];
  };
  isLocal?: boolean;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  journal_id: string;
  created_at: string;
  username?: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
}

const styles = `
  @keyframes gradient-x {
    0%, 100% {
      background-size: 200% 200%;
      background-position: left center;
    }
    50% {
      background-size: 200% 200%;
      background-position: right center;
    }
  }

  .animate-gradient-x {
    animation: gradient-x 15s ease infinite;
  }

  .animate-gradient {
    animation: gradient-x 8s ease infinite;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [journals, setJournals] = useState<JournalCard[]>([]);
  const [activeJournal, setActiveJournal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingJournal, setIsDeletingJournal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [localJournals, setLocalJournals] = useState<JournalCard[]>([]);
  const [activeJournalContent, setActiveJournalContent] = useState<any>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Load local journals from the Electron main process
  const loadLocalJournals = async () => {
    try {
      console.log('Starting to load local journals...');
      const localJournalsData = await window.electron.ipcRenderer.invoke(
        'get-all-journals'
      );
      console.log('Raw local journals from service:', localJournalsData);

      // Filter for local journals (assuming local journals don't have user_id or published flag)
      const filteredLocalJournals = localJournalsData.filter(
        (journal) => !journal.user_id
      );

      // Transform local journals data
      const transformedLocalJournals = filteredLocalJournals.map((journal) => {
        let content;
        try {
          // Check if content is already an object or needs parsing
          content =
            typeof journal.content === 'string'
              ? JSON.parse(journal.content)
              : journal.content; // Assume it's already an object
        } catch (e) {
          console.error('Error parsing local journal content:', e);
          content = { bullets: [], images: [] };
        }
        return {
          ...journal,
          lastEdited: new Date(journal.updated_at || journal.created_at),
          isLocal: true,
          content: content,
        };
      });

      console.log('Local journals state updated:', transformedLocalJournals);
      setLocalJournals(transformedLocalJournals);
    } catch (error) {
      console.error('Error loading local journals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load local journals',
        variant: 'destructive',
      });
    }
  };

  const loadJournals = async () => {
    try {
      setIsLoading(true);
      const { data: journalsData, error: journalsError } = await supabase
        .from('journals')
        .select(
          `
          *,
          profiles:user_id (
            full_name
          )
        `
        )
        .order('created_at', { ascending: false });

      if (journalsError) throw journalsError;

      // Get comments count for each journal
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('journal_id');

      if (commentsError) throw commentsError;

      const commentsCountMap = commentsData.reduce(
        (acc: Record<string, number>, comment) => {
          acc[comment.journal_id] = (acc[comment.journal_id] || 0) + 1;
          return acc;
        },
        {}
      );

      // Transform journals data
      const transformedJournals = journalsData.map((journal) => {
        let content;
        try {
          // Check if content is already an object or needs parsing
          content =
            typeof journal.content === 'string'
              ? JSON.parse(journal.content)
              : journal.content; // Assume it's already an object
        } catch (e) {
          console.error('Error parsing journal content:', e);
          content = { bullets: [], images: [] };
        }

        return {
          id: journal.id,
          title: journal.title,
          lastEdited: new Date(journal.updated_at || journal.created_at),
          user_id: journal.user_id,
          published: true,
          likes: Math.floor(Math.random() * 50), // Placeholder for now
          comments: commentsCountMap[journal.id] || 0,
          // Safely access full_name, assuming profiles is an array with one element or null
          author_name:
            Array.isArray(journal.profiles) && journal.profiles.length > 0
              ? journal.profiles[0].full_name
              : 'Anonymous',
          content: content, // Add the parsed content
        };
      });

      setJournals(transformedJournals);
    } catch (error) {
      console.error('Error loading journals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load journals',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check authentication and load journals
    const checkAuthAndLoadJournals = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login');
        return;
      }

      setUser(session.user);

      // Load both local and online journals
      await Promise.all([loadJournals(), loadLocalJournals()]);
    };

    checkAuthAndLoadJournals();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast, reloadTrigger]);

  useEffect(() => {
    // Load comments if a journal is active
    const loadComments = async () => {
      if (!activeJournal) return;

      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('journal_id', activeJournal)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading comments:', error);
        } else if (data) {
          // Get usernames for comments
          const userIds = [...new Set(data.map((comment) => comment.user_id))];

          let usernamesMap: Record<string, string> = {};
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username')
              .in('id', userIds);

            if (profiles) {
              usernamesMap = profiles.reduce(
                (acc: Record<string, string>, profile: any) => {
                  acc[profile.id] = profile.username || 'Anonymous';
                  return acc;
                },
                {}
              );
            }
          }

          const commentsWithUsernames = data.map((comment) => ({
            ...comment,
            username: usernamesMap[comment.user_id] || 'Anonymous',
          }));

          setComments(commentsWithUsernames);
        }
      } catch (error) {
        console.error('Failed to load comments:', error);
      }
    };

    loadComments();
  }, [activeJournal]);

  useEffect(() => {
    console.log('Local journals state updated:', localJournals);
  }, [localJournals]);

  useEffect(() => {
    console.log('Online journals state updated:', journals);
  }, [journals]);

  useEffect(() => {
    console.log('Active journal changed:', activeJournal);
  }, [activeJournal]);

  const createNewJournal = async () => {
    try {
      // Reset the journal state first
      // journalState.resetState();

      // Create a new journal with empty content initially
      const newJournal = {
        id: uuidv4(),
        title: `Journal ${journals.length + 1}`,
        lastEdited: new Date(),
        user_id: user?.id,
        content: {
          bullets: [], // Start with empty bullets
          images: [],
        },
      };

      // Set as active journal first
      setActiveJournal(newJournal.id);

      // Set active journal content to null to trigger template initialization in useJournalState
      setActiveJournalContent(null);

      // Update the journals list
      setJournals((prevJournals) => [...prevJournals, newJournal]);

      // Save the journal to the database
      await handleAutoSave(newJournal);
    } catch (error) {
      console.error('Error creating new journal:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new journal',
        variant: 'destructive',
      });
    }
  };

  const handlePostComment = async () => {
    if (!activeJournal || !newComment.trim() || !user) return;

    setIsCommenting(true);

    try {
      // Create the new comment object
      const commentData = {
        journal_id: activeJournal,
        user_id: user.id,
        content: newComment.trim(),
      };

      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // Add the new comment to the list
        const newCommentObj = {
          ...data[0],
          username: user.user_metadata?.username || 'Anonymous',
        } as Comment;

        setComments([newCommentObj, ...comments]);
        setNewComment('');

        toast({
          title: 'Comment posted',
          description: 'Your comment has been added successfully.',
        });
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Failed to post comment',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteJournal = async (journalId: string) => {
    if (window.confirm('Are you sure you want to delete this journal?')) {
      try {
        // Replace with IPC call
        await window.electron.ipcRenderer.invoke('delete-journal', journalId);
        setJournals(journals.filter((journal) => journal.id !== journalId));
        // Close the full editor if the deleted journal was open
        if (activeJournal === journalId) {
          setActiveJournal(null);
          setActiveJournalContent(null);
        }
        return true; // Indicate success
      } catch (error) {
        console.error('Failed to delete journal:', journalId, error);
        // Optionally, show an error to the user
        return false; // Indicate failure
      }
    }
    return false; // Indicate cancellation
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Update local state
      setComments(comments.filter((comment) => comment.id !== commentId));

      toast({
        title: 'Comment deleted',
        description: 'Your comment has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Failed to delete comment',
        description: 'There was an error deleting your comment.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Modify the handleJournalClick function
  const handleJournalClick = async (journalId: string) => {
    try {
      console.log('handleJournalClick: Journal ID clicked:', journalId);
      setActiveJournal(journalId);
      console.log('handleJournalClick: Setting activeJournal to:', journalId);
      await loadJournalContent(journalId);
      console.log(
        'handleJournalClick: loadJournalContent finished for ID:',
        journalId
      );
    } catch (error) {
      console.error('Error handling journal click:', error);
      toast({
        title: 'Error',
        description: 'Failed to open journal',
        variant: 'destructive',
      });
    }
  };

  // Add this function to load journal content
  const loadJournalContent = async (journalId: string) => {
    try {
      console.log('loadJournalContent: Starting for journal ID:', journalId);

      // Check if it's a local journal
      const localJournal = localJournals.find((j) => j.id === journalId);
      if (localJournal) {
        console.log('loadJournalContent: Found local journal:', localJournal);
        let content;
        try {
          // Parse or process the content
          let parsedContent;
          if (typeof localJournal.content === 'string') {
            parsedContent = JSON.parse(String(localJournal.content));
          } else {
            parsedContent = localJournal.content || {};
          }
          
          // Ensure content has required structure
          content = {
            bullets: Array.isArray(parsedContent.bullets) ? parsedContent.bullets : [],
            images: Array.isArray(parsedContent.images) ? parsedContent.images : [],
            videos: Array.isArray(parsedContent.videos) ? parsedContent.videos : []
          };
          
          console.log(
            'loadJournalContent: Parsed local journal content:',
            content
          );
        } catch (e) {
          console.error(
            'loadJournalContent: Error parsing local journal content:',
            e
          );
          content = { bullets: [], images: [], videos: [] };
        }
        console.log(
          'loadJournalContent: Setting activeJournalContent for local journal:',
          content
        );
        setActiveJournalContent(content);
        return;
      }

      // If not local, it's an online journal
      const { data, error } = await supabase
        .from('journals')
        .select('*') // Changed to select all fields
        .eq('id', journalId)
        .single();

      if (error) throw error;
      if (data) {
        console.log('loadJournalContent: Found online journal data:', data);
        let content;
        try {
          // Parse the content string from the database
          let parsedContent;
          if (typeof data.content === 'string') {
            parsedContent = JSON.parse(String(data.content));
          } else {
            parsedContent = data.content || {};
          }
          
          // Ensure content has required structure
          content = {
            bullets: Array.isArray(parsedContent.bullets) ? parsedContent.bullets : [],
            images: Array.isArray(parsedContent.images) ? parsedContent.images : [],
            videos: Array.isArray(parsedContent.videos) ? parsedContent.videos : []
          };
          
          console.log(
            'loadJournalContent: Parsed online journal content:',
            content
          );
        } catch (e) {
          console.error(
            'loadJournalContent: Error parsing online journal content:',
            e
          );
          content = { bullets: [], images: [], videos: [] };
        }
        console.log(
          'loadJournalContent: Setting activeJournalContent for online journal:',
          content
        );
        setActiveJournalContent(content);
      } else {
        console.log(
          'loadJournalContent: No online journal data found for ID:',
          journalId
        );
        // Maybe clear active content or set a default if no data is found
        setActiveJournalContent(null); // Or a default empty structure
      }
    } catch (error) {
      console.error(
        'loadJournalContent: Error loading journal content:',
        error
      );
      toast({
        title: 'Error',
        description: 'Failed to load journal content',
        variant: 'destructive',
      });
      setActiveJournalContent(null); // Clear content on error
    }
  };

  // Handle deletion of local journals (Electron)
  const handleDeleteLocalJournal = async (journalId: string) => {
    if (window.confirm('Are you sure you want to delete this local journal?')) {
      try {
        console.log('Deleting local journal:', journalId);
        // Use IPC to delete journal in main process
        await window.electron.ipcRenderer.invoke('delete-journal', journalId);

        // Update local state
        setLocalJournals((prevJournals) =>
          prevJournals.filter((j) => j.id !== journalId)
        );

        // Clear active journal if it was the deleted one
        if (activeJournal === journalId) {
          setActiveJournal(null);
          setActiveJournalContent(null);
        }

        toast({
          title: 'Local Journal Deleted',
          description: 'Your local journal has been deleted successfully.',
        });
      } catch (error) {
        console.error('Failed to delete local journal:', journalId, error);
        toast({
          title: 'Failed to delete local journal',
          description: 'There was an error deleting your local journal.',
          variant: 'destructive',
        });
      }
    }
  };

  // Add a function to reload all journals
  const reloadAllJournals = async () => {
    await Promise.all([loadJournals(), loadLocalJournals()]);
  };

  // Handle auto-saving for both local and online journals using IPC
  const handleAutoSave = async (journalData: JournalCard) => {
    console.log('Attempting auto-save for journal:', journalData.id);
    // The state updates for isLocalSaving and lastSaved are handled within the useJournalState hook
    try {
      await window.electron.ipcRenderer.invoke(
        'auto-save-journal',
        journalData
      );
      console.log('Auto-save successful for journal:', journalData.id);
      // Optionally update a general last saved time state in Index.tsx if needed, but per-journal state is in useJournalState
    } catch (error) {
      console.error('Auto-save failed for journal:', journalData.id, error);
      // Optionally, show an error to the user
    }
  };

  // Add ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeJournal) {
        setActiveJournal(null);
        reloadAllJournals();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [activeJournal]);

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <Loader2 className='h-8 w-8 animate-spin text-gray-500' />
        <span className='ml-2 text-gray-600'>Loading your journals...</span>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8'>
      <header className='max-w-7xl mx-auto mb-12 flex justify-between items-center relative'>
        <div className='relative group'>
          <div className='absolute -inset-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur-xl opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-gradient'></div>
          <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200'></div>
          <div className='relative'>
            <h1 className='text-4xl md:text-6xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x tracking-tight'>
              S-Reboot
            </h1>
            <p className='text-gray-600 text-lg md:text-xl font-medium max-w-2xl leading-relaxed'>
              Your personal space for nested journaling and creative expression
            </p>
          </div>
        </div>
        <div className='flex gap-3'>
          <Button
            variant='outline'
            className='flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border-2'
            onClick={() => navigate('/posts')}
          >
            <BookOpen className='h-5 w-5' />
            <span className='font-medium'>Browse Posts</span>
          </Button>
          <Button 
            variant='outline' 
            className='hover:bg-red-50 hover:text-red-600 transition-all duration-200 border-2'
            onClick={() => supabase.auth.signOut()}
          >
            Log Out
          </Button>
        </div>
      </header>

      {activeJournal ? (
        <div className='max-w-7xl mx-auto animate-fade-in'>
          <div className='flex justify-between items-center mb-8 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-sm'>
            <Button
              variant='outline'
              onClick={() => {
                setActiveJournal(null);
                reloadAllJournals();
              }}
              className='hover:scale-105 transition-all duration-200 bg-white/80 hover:bg-white border-2 flex items-center gap-2 group'
            >
              <svg 
                className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Journals
            </Button>

            <div className='flex space-x-3'>
              <Button 
                variant='outline' 
                className='flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border-2 bg-white/80 hover:bg-white'
              >
                <Share2 className='h-5 w-5' />
                <span className='font-medium'>Share</span>
              </Button>

              {journals.find((j) => j.id === activeJournal)?.user_id === user?.id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant='destructive'
                      className='flex items-center gap-2 hover:bg-red-600/90 transition-all duration-200 bg-white/80 hover:bg-white'
                    >
                      <Trash2 className='h-5 w-5' />
                      <span className='font-medium'>Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className='bg-white/95 backdrop-blur-sm border border-gray-100'>
                    <AlertDialogHeader>
                      <AlertDialogTitle className='text-xl font-bold text-gray-900'>Delete Journal</AlertDialogTitle>
                      <AlertDialogDescription className='text-gray-600'>
                        This action cannot be undone. This will permanently delete your journal and all associated comments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className='bg-gray-100 hover:bg-gray-200 text-gray-700'>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className='bg-red-600 hover:bg-red-700 text-white'
                        onClick={() => handleDeleteJournal(activeJournal)}
                        disabled={isDeletingJournal}
                      >
                        {isDeletingJournal ? (
                          <>
                            <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Journal Editor */}
          <div className='bg-white/50 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm p-6'>
            <Journal
              initialTitle={
                journals.find((j) => j.id === activeJournal)?.title ||
                localJournals.find((j) => j.id === activeJournal)?.title ||
                'My Journal'
              }
              initialContent={activeJournalContent}
              journalId={activeJournal}
            />
          </div>
        </div>
      ) : (
        <div className='max-w-7xl mx-auto animate-fade-in'>
          <div className='flex justify-between items-center mb-8 bg-white/50 backdrop-blur-sm p-6 rounded-xl border border-gray-100 shadow-sm'>
            <div>
              <h2 className='text-2xl font-bold text-gray-800 mb-2'>Your Journals</h2>
              <p className='text-gray-600'>Create and manage your personal journal entries</p>
            </div>
            <Button
              onClick={createNewJournal}
              className='hover:scale-105 transition-all duration-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl flex items-center gap-2'
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Journal
            </Button>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {/* Local Journals */}
            {localJournals.map((journal, index) => (
              <Card
                key={`local-${journal.id}`}
                className='group relative bg-white hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 hover:rotate-1 animate-fade-in border border-gray-100'
                style={{
                  animationDelay: `${index * 50}ms`,
                  perspective: '1000px',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className='absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg' />
                <CardHeader className='pb-2 relative z-10'>
                  <CardTitle className='text-lg flex justify-between items-center'>
                    <span
                      className='cursor-pointer font-semibold text-gray-800 hover:text-blue-600 transition-colors duration-200'
                      onClick={() => handleJournalClick(journal.id)}
                    >
                      {journal.title}
                    </span>
                    <div className='flex items-center gap-2'>
                      <Edit
                        className='h-4 w-4 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors duration-200'
                        onClick={(e) => e.stopPropagation()}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 transition-all duration-200'
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Journal</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this journal? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLocalJournal(journal.id);
                              }}
                              className='bg-red-500 hover:bg-red-600'
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardTitle>
                  <div className='text-sm text-gray-500 flex items-center gap-2'>
                    <span className='px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium'>
                      Local Journal
                    </span>
                  </div>
                </CardHeader>
                <CardContent className='relative z-10'>
                  <p className='text-sm text-gray-500 flex items-center gap-2'>
                    <span className='font-medium'>Last edited:</span>
                    {new Date(journal.lastEdited).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}

            {/* Online Journals */}
            {journals.map((journal, index) => (
              <Card
                key={`online-${journal.id}`}
                className='group relative bg-white hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 hover:rotate-1 animate-fade-in border border-gray-100'
                style={{
                  animationDelay: `${(localJournals.length + index) * 50}ms`,
                  perspective: '1000px',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className='absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg' />
                <CardHeader className='pb-2 relative z-10'>
                  <CardTitle className='text-lg flex justify-between items-center'>
                    <span
                      className='cursor-pointer font-semibold text-gray-800 hover:text-purple-600 transition-colors duration-200'
                      onClick={() => handleJournalClick(journal.id)}
                    >
                      {journal.title}
                    </span>
                    {journal.user_id === user?.id && (
                      <div className='flex items-center gap-2'>
                        <Edit
                          className='h-4 w-4 text-gray-400 hover:text-purple-500 cursor-pointer transition-colors duration-200'
                          onClick={(e) => e.stopPropagation()}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 transition-all duration-200'
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Journal
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this journal?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteJournal(journal.id);
                                }}
                                className='bg-red-500 hover:bg-red-600'
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardTitle>
                  <div className='text-sm text-gray-500 flex items-center gap-2'>
                    <span className='px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium'>
                      By {journal.author_name || 'Anonymous'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className='relative z-10'>
                  <p className='text-sm text-gray-500 flex items-center gap-2'>
                    <span className='font-medium'>Last edited:</span>
                    {journal.lastEdited.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
