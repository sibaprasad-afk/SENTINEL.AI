import { AlertTriangle, RotateCcw } from 'lucide-react';
import React from 'react';
import { GlassButton, GlassCard } from './glass/GlassPrimitives';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('SENTINEL AI ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let displayDetail = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as {
          error?: string;
          operationType?: string;
          path?: string;
        };
        if (parsed.error) {
          displayDetail = `${parsed.error}${parsed.path ? ` (${parsed.operationType} · ${parsed.path})` : ''}`;
        }
      } catch {
        // Use plain message
      }

      return (
        <div className="min-h-screen bg-[#050814] text-[#F4F7FF] flex items-center justify-center p-6">
          <GlassCard elevated accent="critical" className="max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#FF647C]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h1 className="font-display text-lg font-semibold">Workspace Recovery</h1>
            </div>
            <p className="text-xs leading-relaxed text-[#A5B0C7]">{displayDetail}</p>
            <GlassButton
              type="button"
              variant="primary"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reload Workspace</span>
            </GlassButton>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
