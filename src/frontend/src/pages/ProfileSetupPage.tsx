import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '../backend';
import { UserRole } from '../backend';

export default function ProfileSetupPage() {
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');

  const { actor } = useActor();
  const saveProfileMutation = useSaveCallerUserProfile();

  const isSaving = saveProfileMutation.isPending;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    // Validation
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!contact.trim()) {
      toast.error('Please enter your contact number');
      return;
    }

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      if (!actor) {
        toast.error('System not ready. Please try again.');
        return;
      }

      // Check if email is active in the system
      const hasActiveProfile = await actor.hasActiveProfile(email.trim());
      
      if (!hasActiveProfile) {
        // No active profile with this email exists
        toast.error('Your email ID is not activated. Please contact the administrator.');
        return;
      }

      // If validation passes, save the profile
      const profile: UserProfile = {
        fullName: fullName.trim(),
        contact: contact.trim(),
        email: email.trim(),
        role: UserRole.admin, // First user is admin
        active: true,
      };

      await saveProfileMutation.mutateAsync(profile);
      toast.success('Profile setup complete!');
    } catch (error: any) {
      console.error('Profile setup error:', error);
      // Show the exact error message from backend
      toast.error(error.message || 'Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src="/assets/logo mkt.png" alt="ClearPay Logo" className="h-20 w-20" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Century Gothic, Gothic A1, sans-serif', fontWeight: 700 }}>
              Profile Setup
            </CardTitle>
            <CardDescription className="text-base mt-2" style={{ fontFamily: 'Century Gothic, Gothic A1, sans-serif', fontWeight: 400 }}>
              Complete your profile to get started
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" style={{ fontFamily: 'Century Gothic, Gothic A1, sans-serif', fontWeight: 400 }}>
              Full Name *
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSaving}
              style={{ fontFamily: 'Century Gothic, Gothic A1, sans-serif', fontWeight: 400 }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact" style={{ fontFamily: 'Century Gothic, Gothic A1, sans-serif', fontWeight: 400 }}>
              Contact Number *
            </Label>
            <Input
              id="contact"
              type="tel"
              placeholder="Enter your contact number"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={isSaving}
              style={{ fontFamily: 'Century Gothic, Gothic A1, sans-serif', fontWeight: 400 }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" style={{ fontFamily: 'Century Gothic, Gothic A1, sans-serif', fontWeight: 400 }}>
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSaving}
              style={{ fontFamily: 'Century Gothic, Gothic A1, sans-serif', fontWeight: 400 }}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#28A745] hover:bg-[#218838] text-white"
            style={{ fontFamily: 'Century Gothic, Gothic A1, sans-serif', fontWeight: 600 }}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
