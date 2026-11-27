import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ManuscriptDivider } from './KashmiriOrnaments';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected interruption occurred.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen paper-surface paper-grain flex items-center justify-center px-6 py-16">
          <div className="max-w-lg w-full bg-[#E9DFC9]/70 border border-[#493528]/20 p-10 text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-[#9C443B] font-medium mb-3">
              SHAHNOOR Writes
            </p>
            <h1 className="font-display text-3xl text-[#25231F] mb-4">
              A quiet pause on the page
            </h1>
            <ManuscriptDivider className="my-5" />
            <p className="font-editorial text-sm text-[#493528]/85 leading-relaxed mb-6">
              Something interrupted the rendering of this folio. Please refresh or return to the front page.
            </p>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="px-6 py-2.5 text-xs font-medium tracking-wide bg-[#493528] text-[#F2EBDD] hover:bg-[#25231F] transition-colors cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
