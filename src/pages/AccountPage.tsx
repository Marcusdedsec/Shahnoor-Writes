import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Feather,
  LogOut,
  MailCheck,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { useEditorial } from '../context/EditorialContext';
import { ChinarLeafMark, ManuscriptDivider } from '../components/KashmiriOrnaments';

function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/email-already-in-use')) {
    return 'An account with this email ID already exists. Try signing in instead, or use another email address.';
  }
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (msg.includes('auth/user-not-found')) {
    return 'No account found with that email ID. Switch to Create Account to register.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'Please choose a stronger password (at least 6 characters).';
  }
  if (msg.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('auth/operation-not-allowed')) {
    return 'Email & password sign-in is not yet enabled in Firebase Authentication for this project.';
  }
  if (msg.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please pause a moment before trying again.';
  }
  return msg;
}

export const AccountPage: React.FC = () => {
  const {
    user,
    userProfile,
    authReady,
    isAdmin,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    resendVerificationEmail,
    refreshUserSession,
    updateUserProfile,
    signOutUser,
  } = useEditorial();

  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');

  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Reader Account — SHAHNOOR Writes';
  }, []);

  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.displayName);
      setProfileBio(userProfile.bio);
    } else if (user) {
      setProfileName(user.displayName || user.email?.split('@')[0] || '');
    }
  }, [userProfile, user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNotice(null);
    setBusy(true);
    try {
      if (authMode === 'signup') {
        await signUpWithEmail({ displayName, email, password, bio });
        setNotice(
          'Your account has been created and a verification link was sent to your email ID. Please verify your email to share thoughts and reflections.',
        );
        setPassword('');
      } else {
        await signInWithEmail(email, password);
        setPassword('');
      }
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setNotice(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg(null);
    setNotice(null);
    setBusy(true);
    try {
      await resendVerificationEmail();
      setNotice('A fresh verification link has been sent to your email address.');
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshVerification = async () => {
    setErrorMsg(null);
    setNotice(null);
    setBusy(true);
    try {
      const verified = await refreshUserSession();
      if (verified) {
        setNotice('Email verified! You can now share thoughts and article reflections.');
      } else {
        setNotice('Your email is still pending verification. Please check your inbox and click the link.');
      }
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNotice(null);
    setBusy(true);
    try {
      await updateUserProfile(profileName, profileBio);
      setNotice('Your reader profile has been updated.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchAccount = async () => {
    setErrorMsg(null);
    setNotice(null);
    await signOutUser();
    setAuthMode('signup');
    setDisplayName('');
    setEmail('');
    setPassword('');
    setBio('');
  };

  if (!authReady) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-24 text-center">
        <p className="font-display italic text-2xl text-[#493528]">
          Opening reader ledger...
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <header className="text-center max-w-2xl mx-auto mb-12">
        <ChinarLeafMark className="w-7 h-7 text-[#9C443B] mx-auto mb-4" />
        <p className="text-xs tracking-[0.2em] uppercase text-[#9C443B] font-medium mb-3">
          Reader Circle &amp; Accounts
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#25231F] mb-4">
          {user ? 'Your Literary Profile' : 'Join SHAHNOOR Writes'}
        </h1>
        <p className="font-editorial text-base text-[#493528]/80 leading-relaxed">
          Create an account with your email ID—or register separate accounts whenever you wish—to share your own thoughts in the reader circle and leave reflections beneath essays.
        </p>
      </header>

      {notice && (
        <div className="mb-6 p-4 bg-[#485B47]/10 border border-[#485B47]/30 text-sm text-[#485B47]">
          {notice}
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="mb-6 p-4 bg-[#9C443B]/10 border border-[#9C443B]/30 text-sm text-[#9C443B]">
          {errorMsg}
        </div>
      )}

      {!user ? (
        <section className="max-w-xl mx-auto ivory-surface border border-[#493528]/18 p-7 sm:p-10">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 border border-[#493528]/20 bg-[#F2EBDD] p-1 mb-7">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors ${
                authMode === 'signup' ? 'bg-[#493528] text-[#F2EBDD]' : 'text-[#493528]'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors ${
                authMode === 'signin' ? 'bg-[#493528] text-[#F2EBDD]' : 'text-[#493528]'
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {authMode === 'signup' && (
              <div>
                <label
                  htmlFor="acc-name"
                  className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
                >
                  Display Name
                </label>
                <input
                  id="acc-name"
                  type="text"
                  required
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How your name appears beside your thoughts"
                  className="w-full px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="acc-email"
                className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
              >
                Email ID
              </label>
              <input
                id="acc-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
              />
            </div>

            <div>
              <label
                htmlFor="acc-password"
                className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
              >
                Password
              </label>
              <input
                id="acc-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 text-sm bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
              />
            </div>

            {authMode === 'signup' && (
              <div>
                <label
                  htmlFor="acc-bio"
                  className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
                >
                  Short Bio (Optional)
                </label>
                <textarea
                  id="acc-bio"
                  rows={2}
                  maxLength={300}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A brief note about what you love to read or write..."
                  className="w-full px-4 py-2.5 text-sm bg-[#F2EBDD] border border-[#493528]/22 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 text-xs font-medium uppercase tracking-[0.12em] bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors cursor-pointer disabled:opacity-60"
            >
              {busy
                ? 'Please wait...'
                : authMode === 'signup'
                  ? 'Create Account with Email'
                  : 'Sign In with Email'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-[#493528]/60">
            <span className="flex-1 h-px bg-[#493528]/15" />
            <span>or</span>
            <span className="flex-1 h-px bg-[#493528]/15" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGoogleSignIn()}
            className="w-full py-3 text-xs font-medium uppercase tracking-[0.1em] border border-[#493528]/30 text-[#25231F] hover:border-[#9C443B] hover:text-[#9C443B] transition-colors cursor-pointer"
          >
            Continue with Google
          </button>
        </section>
      ) : (
        <div className="space-y-8">
          {/* Status Banner */}
          <section className="ivory-surface border border-[#493528]/18 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] mb-1.5">
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-[#485B47]">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified Reader Account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[#9C443B]">
                    <MailCheck className="w-4 h-4" />
                    Email Verification Pending
                  </span>
                )}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#25231F]">
                {userProfile?.displayName || user.displayName || 'Reader'}
              </h2>
              <p className="text-xs text-[#493528]/75 mt-1">{user.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/thoughts"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#9C443B] text-[#F2EBDD] hover:bg-[#493528] transition-colors"
              >
                <Feather className="w-3.5 h-3.5" />
                Share Thoughts
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#485B47] text-[#F2EBDD] hover:bg-[#493528] transition-colors"
                >
                  Author Studio
                </Link>
              )}
              <button
                type="button"
                onClick={() => void handleSwitchAccount()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border border-[#493528]/25 text-[#493528] hover:border-[#9C443B] cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Switch / New Account
              </button>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs text-[#493528]/75 hover:text-[#9C443B] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </section>

          {!user.emailVerified && (
            <section className="p-6 bg-[#9C443B]/8 border border-[#9C443B]/25 space-y-4">
              <h3 className="font-display text-xl font-medium text-[#25231F]">
                Verify your email ID to begin sharing
              </h3>
              <p className="font-editorial text-sm text-[#493528]/85 leading-relaxed">
                We sent a confirmation link to <span className="font-medium text-[#25231F]">{user.email}</span>. Once you click that link, return here and refresh your session to post thoughts and article reflections.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRefreshVerification()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  I&apos;ve Verified — Refresh
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleResend()}
                  className="px-4 py-2 text-xs font-medium border border-[#493528]/30 text-[#493528] hover:border-[#9C443B] cursor-pointer"
                >
                  Resend Verification Email
                </button>
              </div>
            </section>
          )}

          {/* Profile Editor */}
          <section className="ivory-surface border border-[#493528]/18 p-6 sm:p-8">
            <h3 className="font-display text-2xl font-medium text-[#25231F] mb-5">
              Public Display Details
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
              <div>
                <label
                  htmlFor="prof-name"
                  className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
                >
                  Display Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  required
                  maxLength={80}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-bio"
                  className="block text-xs uppercase tracking-[0.12em] text-[#493528]/75 mb-1.5"
                >
                  Bio
                </label>
                <textarea
                  id="prof-bio"
                  rows={3}
                  maxLength={300}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Share a brief note about your interests..."
                  className="w-full px-4 py-2.5 text-sm bg-[#F2EBDD] border border-[#493528]/20 text-[#25231F] focus:outline-none focus:border-[#9C443B]"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 text-xs font-medium uppercase tracking-wider bg-[#493528] text-[#F2EBDD] hover:bg-[#9C443B] transition-colors cursor-pointer"
              >
                {busy ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </section>
        </div>
      )}

      <ManuscriptDivider className="mt-16" />
    </main>
  );
};
