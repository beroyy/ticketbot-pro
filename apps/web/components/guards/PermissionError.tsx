import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface PermissionErrorProps {
  message?: string;
  guildId?: string;
  showRequestAccess?: boolean;
}

/**
 * Error component displayed when user lacks required permissions
 * Can be used as a fallback in WithPermission or standalone
 */
export default function PermissionError({
  message = "You don't have permission to access this content",
  guildId,
  showRequestAccess = true,
}: PermissionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto w-16 h-16 mb-4 text-red-500">
          <AlertCircle className="w-full h-full" />
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Permission Denied
        </h2>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {guildId && (
            <Link
              href={`/g/${guildId}/dashboard`}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </Link>
          )}
          
          {showRequestAccess && (
            <button
              type="button"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Request Access
            </button>
          )}
        </div>
      </div>
    </div>
  );
}