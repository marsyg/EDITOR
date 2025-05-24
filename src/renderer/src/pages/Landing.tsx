import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import newPlaceHolder from  '../../../../public/newPlaceHolder.jpg'
const Landing = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50'>
      {/* Header with navigation */}
      <header className='bg-white/90 backdrop-blur-sm border-b border-gray-100 p-4 md:p-6 shadow-sm'>
        <div className='container mx-auto flex justify-between items-center'>
          <h1 className='text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>
            S REBOOT
          </h1>
          <div className='space-x-2'>
            {isAuthenticated ? (
              <>
                <Button
                  variant='outline'
                  onClick={() => navigate('/app')}
                  className='border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
                >
                  Go to App
                </Button>
                <Button
                  variant='ghost'
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/');
                  }}
                  className='text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant='ghost'
                  onClick={() => navigate('/login')}
                  className='text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                >
                  Login
                </Button>
                <Button
                  variant='outline'
                  onClick={() => navigate('/login?signup=true')}
                  className='border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className='grid md:grid-cols-5 flex-1'>
        {/* Left sidebar with profile */}
        <div className='bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6 md:col-span-2 flex flex-col items-center justify-center relative overflow-hidden'>
          <div className='absolute inset-0 bg-white/10 backdrop-blur-sm'></div>
          <div className='relative z-10 text-center'>
            <div className='w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 bg-white/20 backdrop-blur-md ring-4 ring-white/20 shadow-lg'>
              <img
                src={newPlaceHolder}
                alt='Profile'
                className='w-full h-full object-cover'
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = './newPlaceHolder.svg';
                }}
              />
            </div>
            <h1 className='text-3xl md:text-4xl font-bold mb-3'>
              S REBOOT
            </h1>
            <p className='text-white/90 mb-6 text-lg max-w-md mx-auto'>
              A nested bullet journal with rich text, media support, and
              beautiful sharing options
            </p>
            <div className='flex justify-center space-x-4 text-white/90 text-xl mt-8'>
              <a
                href='#'
                className='hover:text-white transition-colors p-2 hover:scale-105'
              >
                <span className='sr-only'>Twitter</span>
                <svg
                  viewBox='0 0 24 24'
                  width='24'
                  height='24'
                  stroke='currentColor'
                  strokeWidth='2'
                  fill='none'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='lucide lucide-twitter'
                >
                  <path d='M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z'></path>
                </svg>
              </a>
              <a
                href='#'
                className='hover:text-white transition-colors p-2 hover:scale-105'
              >
                <span className='sr-only'>GitHub</span>
                <svg
                  viewBox='0 0 24 24'
                  width='24'
                  height='24'
                  stroke='currentColor'
                  strokeWidth='2'
                  fill='none'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='lucide lucide-github'
                >
                  <path d='M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4'></path>
                </svg>
              </a>
              <a
                href='#'
                className='hover:text-white transition-colors p-2 hover:scale-105'
              >
                <span className='sr-only'>Email</span>
                <svg
                  viewBox='0 0 24 24'
                  width='24'
                  height='24'
                  stroke='currentColor'
                  strokeWidth='2'
                  fill='none'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='lucide lucide-mail'
                >
                  <rect width='20' height='16' x='2' y='4' rx='2'></rect>
                  <path d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'></path>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className='p-6 md:p-12 md:col-span-3 flex flex-col justify-center bg-white/50 backdrop-blur-sm overflow-y-auto'>
          <div className='max-w-3xl mx-auto'>
            <h2 className='text-4xl md:text-5xl font-bold mb-8 text-gray-800 leading-tight'>
              Welcome to My <span className='text-indigo-600'>Reboot</span>
            </h2>

            <div className='prose prose-lg max-w-none'>
              <p className='text-gray-700 mb-6 leading-relaxed'>
                A few months ago, I found myself beneath the cold, relentless
                glow of hospital lights. My skull was open, my future
                uncertain—a storm of pain radiating from my arm, my head—but
                somewhere amidst it all, there was a smile. That smile wasn't
                just mine; it belonged to the NICU nurses, the doctors, the
                quiet courage in their eyes.
              </p>

              <p className='text-gray-700 mb-6 leading-relaxed'>
                But fate wasn't done with me yet. Sheer will pulled me back, but
                I was never alone. It was the boundless love of my family, the
                unwavering strength of those around me, that reignited the
                spark. I came back—no memory lost, no logic missing. In my
                terms, no wires cut on my circuit board. Just a fire reignited.
              </p>

              <p className='text-gray-700 mb-6 leading-relaxed'>
                This is my second life. A life I choose to live fully
                connected—with family, with nature, with purpose, with code,
                with AI, and above all—with gratitude.
              </p>

              <div className='bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-sm border border-gray-100 mb-8'>
                <h3 className='text-2xl font-semibold text-gray-800 mb-4'>
                  I owe everything to the incredible souls who stood by me:
                </h3>
                <ul className='space-y-4'>
                  <li className='flex items-start'>
                    <span className='text-indigo-500 mr-3 mt-1'>•</span>
                    <span className='text-gray-700'>
                      My mother, a fortress of quiet strength.
                    </span>
                  </li>
                  <li className='flex items-start'>
                    <span className='text-indigo-500 mr-3 mt-1'>•</span>
                    <span className='text-gray-700'>
                      My sister, a lighthouse in every storm.
                    </span>
                  </li>
                  <li className='flex items-start'>
                    <span className='text-indigo-500 mr-3 mt-1'>•</span>
                    <span className='text-gray-700'>
                      My son, the very breath I take, whose unshakable faith in
                      me became my heartbeat when the world whispered I was a
                      lost cause. Brihas, your Lion will roar again.
                    </span>
                  </li>
                  <li className='flex items-start'>
                    <span className='text-indigo-500 mr-3 mt-1'>•</span>
                    <span className='text-gray-700'>
                      And my friends—the ones who never let go, even when I
                      almost did.
                    </span>
                  </li>
                </ul>
              </div>

              <p className='text-gray-700 mb-6 leading-relaxed'>
                This journey isn't about escape. It's about alignment. I'm not
                running from the world—I'm sitting still in its most sacred
                corners, listening. Reconnecting.
              </p>

              <p className='text-gray-700 mb-6 leading-relaxed'>
                If you're here, you're part of this circle. Thank you for
                walking with me.
              </p>

              <p className='text-gray-700 mb-6 leading-relaxed'>
                Welcome to the reboot.
              </p>

              <div className='bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-sm border border-gray-100 mb-8'>
                <p className='text-gray-700 italic'>
                  Some of you might wonder why I haven't mentioned God. But to
                  me, He is always here—in every quiet act of love, every gentle
                  word, every moment of grace. When He made me, I like to think
                  He picked me up by the neck, looked at my little smile, and
                  whispered, "Okay, I will make sure you are always surrounded
                  by wonderful, loving people in every walk of your life."
                </p>
              </div>

              <div className='text-right text-gray-600'>
                <p className='font-semibold'>— Srikanth S Sampara</p>
                <p className='text-sm'>Sri/Srilu/Srikanth for my family</p>
                <p className='text-sm'>Barre for my friends</p>
              </div>
            </div>

            <div className='mt-12 flex justify-center space-x-4'>
              <Button
                onClick={() =>
                  isAuthenticated ? navigate('/app') : navigate('/login')
                }
                size='lg'
                className='bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition-all duration-200'
              >
                {isAuthenticated ? 'Go to Your Journals' : 'Join the Journey'}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
