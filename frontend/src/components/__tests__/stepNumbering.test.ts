import { describe, it, expect } from 'vitest';

// Copy the functions from Header.tsx to test them directly
const getStepNumber = (currentPage: string, isPremium: boolean): string => {
  // Premium Flow: Upload(1) → Analysis(2) → Role Selection(3) → Feature Selection(4) → Preview(5) → Keywords(6) → Results(7)
  // Non-Premium Flow: Upload(1) → Analysis(2) → Feature Selection(3) → Preview(4) → Keywords(5) → Results(6)
  
  if (isPremium) {
    switch (currentPage) {
      case 'processing':
      case 'upload':
        return '1';
      case 'analysis':
        return '2';
      case 'role-selection':
        return '3';
      case 'feature-selection':
        return '4';
      case 'preview':
      case 'templates':
        return '5';
      case 'keywords':
        return '6';
      case 'results':
      case 'final-results':
        return '7';
      default:
        return '1';
    }
  } else {
    // Non-premium flow (no role selection step)
    switch (currentPage) {
      case 'processing':
      case 'upload':
        return '1';
      case 'analysis':
        return '2';
      case 'feature-selection':
        return '3';
      case 'preview':
      case 'templates':
        return '4';
      case 'keywords':
        return '5';
      case 'results':
      case 'final-results':
        return '6';
      default:
        return '1';
    }
  }
};

const getTotalSteps = (isPremium: boolean): number => {
  // Premium users get role selection step, non-premium users skip it
  return isPremium ? 7 : 6;
};

describe('Step Numbering Logic', () => {
  describe('Premium User Flow', () => {
    const isPremium = true;

    it('should return correct step numbers for premium flow', () => {
      expect(getStepNumber('processing', isPremium)).toBe('1');
      expect(getStepNumber('upload', isPremium)).toBe('1');
      expect(getStepNumber('analysis', isPremium)).toBe('2');
      expect(getStepNumber('role-selection', isPremium)).toBe('3');
      expect(getStepNumber('feature-selection', isPremium)).toBe('4');
      expect(getStepNumber('preview', isPremium)).toBe('5');
      expect(getStepNumber('templates', isPremium)).toBe('5');
      expect(getStepNumber('keywords', isPremium)).toBe('6');
      expect(getStepNumber('results', isPremium)).toBe('7');
      expect(getStepNumber('final-results', isPremium)).toBe('7');
    });

    it('should return correct total steps for premium users', () => {
      expect(getTotalSteps(isPremium)).toBe(7);
    });

    it('should handle unknown pages gracefully for premium users', () => {
      expect(getStepNumber('unknown-page', isPremium)).toBe('1');
    });
  });

  describe('Non-Premium User Flow', () => {
    const isPremium = false;

    it('should return correct step numbers for non-premium flow', () => {
      expect(getStepNumber('processing', isPremium)).toBe('1');
      expect(getStepNumber('upload', isPremium)).toBe('1');
      expect(getStepNumber('analysis', isPremium)).toBe('2');
      expect(getStepNumber('role-selection', isPremium)).toBe('1'); // Defaults to 1 for non-premium
      expect(getStepNumber('feature-selection', isPremium)).toBe('3');
      expect(getStepNumber('preview', isPremium)).toBe('4');
      expect(getStepNumber('templates', isPremium)).toBe('4');
      expect(getStepNumber('keywords', isPremium)).toBe('5');
      expect(getStepNumber('results', isPremium)).toBe('6');
      expect(getStepNumber('final-results', isPremium)).toBe('6');
    });

    it('should return correct total steps for non-premium users', () => {
      expect(getTotalSteps(isPremium)).toBe(6);
    });

    it('should handle unknown pages gracefully for non-premium users', () => {
      expect(getStepNumber('unknown-page', isPremium)).toBe('1');
    });
  });

  describe('Flow Comparisons', () => {
    it('should show linear progression for premium flow', () => {
      const premiumPages = ['processing', 'analysis', 'role-selection', 'feature-selection', 'preview', 'keywords', 'final-results'];
      const expectedSteps = ['1', '2', '3', '4', '5', '6', '7'];
      
      premiumPages.forEach((page, index) => {
        expect(getStepNumber(page, true)).toBe(expectedSteps[index]);
      });
    });

    it('should show linear progression for non-premium flow', () => {
      const nonPremiumPages = ['processing', 'analysis', 'feature-selection', 'preview', 'keywords', 'final-results'];
      const expectedSteps = ['1', '2', '3', '4', '5', '6'];
      
      nonPremiumPages.forEach((page, index) => {
        expect(getStepNumber(page, false)).toBe(expectedSteps[index]);
      });
    });

    it('should handle templates as preview step for both flows', () => {
      expect(getStepNumber('templates', true)).toBe('5'); // Premium preview step
      expect(getStepNumber('templates', false)).toBe('4'); // Non-premium preview step
    });
  });

  describe('Edge Cases', () => {
    it('should handle role-selection page correctly for non-premium users', () => {
      // Non-premium users should not access role-selection, so it defaults to step 1
      expect(getStepNumber('role-selection', false)).toBe('1');
    });

    it('should handle empty/undefined page gracefully', () => {
      expect(getStepNumber('', true)).toBe('1');
      expect(getStepNumber('', false)).toBe('1');
    });
  });
});
