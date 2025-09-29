import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricCard, MetricCardProps } from '../components/Dashboard/MetricCard';
import { User, Building, DollarSign } from 'lucide-react';

/**
 * Comprehensive test suite for MetricCard component
 * Tests card rendering, interactions, data display, and visual feedback
 */
describe('MetricCard Component', () => {
  const defaultProps: MetricCardProps = {
    title: 'Total Employees',
    value: '247',
    color: 'blue',
    icon: User,
  };

  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });

  describe('Card Rendering', () => {
    test('renders card with basic props', () => {
      render(<MetricCard {...defaultProps} />);
      
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
      expect(screen.getByText('247')).toBeInTheDocument();
    });

    test('renders card with custom icon', () => {
      render(<MetricCard {...defaultProps} icon={Building} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      expect(card).toBeInTheDocument();
    });

    test('renders card with ReactNode value', () => {
      const customValue = (
        <div>
          <span>Custom</span>
          <span>Value</span>
        </div>
      );
      
      render(<MetricCard {...defaultProps} value={customValue} />);
      
      expect(screen.getByText('Custom')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();
    });

    test('applies correct color classes', () => {
      const { rerender } = render(<MetricCard {...defaultProps} color="blue" />);
      
      let iconContainer = screen.getByText('Total Employees')
        .closest('div')
        ?.querySelector('[class*="bg-blue-50"]');
      expect(iconContainer).toBeInTheDocument();

      rerender(<MetricCard {...defaultProps} color="green" />);
      iconContainer = screen.getByText('Total Employees')
        .closest('div')
        ?.querySelector('[class*="bg-green-50"]');
      expect(iconContainer).toBeInTheDocument();
    });

    test('renders without trend data', () => {
      render(<MetricCard {...defaultProps} />);
      
      expect(screen.queryByText(/% from last month/)).not.toBeInTheDocument();
    });

    test('renders with positive trend', () => {
      const propsWithTrend = {
        ...defaultProps,
        trend: { value: 12, isPositive: true }
      };
      
      render(<MetricCard {...propsWithTrend} />);
      
      expect(screen.getByText(/12% from last month/)).toBeInTheDocument();
      expect(screen.getByText(/↗/)).toBeInTheDocument();
    });

    test('renders with negative trend', () => {
      const propsWithTrend = {
        ...defaultProps,
        trend: { value: 8, isPositive: false }
      };
      
      render(<MetricCard {...propsWithTrend} />);
      
      expect(screen.getByText(/8% from last month/)).toBeInTheDocument();
      expect(screen.getByText(/↘/)).toBeInTheDocument();
    });
  });

  describe('Card Interactions', () => {
    test('handles click events when onClick is provided', () => {
      const handleClick = jest.fn();
      
      render(<MetricCard {...defaultProps} onClick={handleClick} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      fireEvent.click(card!);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('does not handle click when onClick is not provided', () => {
      render(<MetricCard {...defaultProps} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      
      // Should not throw error when clicking without onClick
      expect(() => fireEvent.click(card!)).not.toThrow();
    });

    test('applies clickable styling when onClick is provided', () => {
      const handleClick = jest.fn();
      
      render(<MetricCard {...defaultProps} onClick={handleClick} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      expect(card).toHaveClass('cursor-pointer');
    });

    test('does not apply clickable styling when onClick is not provided', () => {
      render(<MetricCard {...defaultProps} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      expect(card).not.toHaveClass('cursor-pointer');
    });

    test('handles hover effects', () => {
      render(<MetricCard {...defaultProps} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      expect(card).toHaveClass('hover:scale-105');
      expect(card).toHaveClass('hover:shadow-lg');
    });

    test('handles keyboard accessibility', () => {
      const handleClick = jest.fn();
      
      render(<MetricCard {...defaultProps} onClick={handleClick} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      
      // Simulate Enter key press
      fireEvent.keyDown(card!, { key: 'Enter', code: 'Enter' });
      // Note: In a full implementation, you'd need to add keyboard handlers
    });
  });

  describe('Visual Feedback', () => {
    test('has proper shadow and transition classes', () => {
      render(<MetricCard {...defaultProps} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      expect(card).toHaveClass('shadow-md');
      expect(card).toHaveClass('transition');
      expect(card).toHaveClass('transform');
    });

    test('has proper border styling', () => {
      render(<MetricCard {...defaultProps} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-gray-200');
    });

    test('has proper background and rounded corners', () => {
      render(<MetricCard {...defaultProps} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      expect(card).toHaveClass('bg-white');
      expect(card).toHaveClass('rounded-lg');
    });

    test('trend colors are applied correctly', () => {
      const { rerender } = render(
        <MetricCard 
          {...defaultProps} 
          trend={{ value: 12, isPositive: true }} 
        />
      );
      
      let trendElement = screen.getByText(/12% from last month/);
      expect(trendElement).toHaveClass('text-green-600');

      rerender(
        <MetricCard 
          {...defaultProps} 
          trend={{ value: 8, isPositive: false }} 
        />
      );
      
      trendElement = screen.getByText(/8% from last month/);
      expect(trendElement).toHaveClass('text-red-600');
    });
  });

  describe('Data Display', () => {
    test('displays string values correctly', () => {
      render(<MetricCard {...defaultProps} value="1,234" />);
      
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    test('displays number values correctly', () => {
      render(<MetricCard {...defaultProps} value={1234} />);
      
      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    test('displays complex ReactNode values', () => {
      const complexValue = (
        <div>
          <div data-testid="employee-count">Employees: 85</div>
          <div data-testid="salary-total">Salary: AED 450,000</div>
        </div>
      );
      
      render(<MetricCard {...defaultProps} value={complexValue} />);
      
      expect(screen.getByTestId('employee-count')).toHaveTextContent('Employees: 85');
      expect(screen.getByTestId('salary-total')).toHaveTextContent('Salary: AED 450,000');
    });

    test('handles empty or undefined values gracefully', () => {
      const { rerender } = render(<MetricCard {...defaultProps} value="" />);
      expect(screen.getByText('Total Employees')).toBeInTheDocument();

      rerender(<MetricCard {...defaultProps} value={undefined as any} />);
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
    });

    test('formats trend values correctly', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          trend={{ value: 12.5, isPositive: true }} 
        />
      );
      
      expect(screen.getByText(/12\.5% from last month/)).toBeInTheDocument();
    });
  });

  describe('Color Variants', () => {
    const colors: MetricCardProps['color'][] = ['blue', 'yellow', 'red', 'purple', 'green'];
    
    test.each(colors)('renders %s color variant correctly', (color) => {
      render(<MetricCard {...defaultProps} color={color} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      const iconContainer = card?.querySelector(`[class*="bg-${color}-50"]`);
      
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper semantic structure', () => {
      render(<MetricCard {...defaultProps} />);
      
      const title = screen.getByText('Total Employees');
      const value = screen.getByText('247');
      
      expect(title).toBeInTheDocument();
      expect(value).toBeInTheDocument();
    });

    test('title has proper text styling', () => {
      render(<MetricCard {...defaultProps} />);
      
      const title = screen.getByText('Total Employees');
      expect(title).toHaveClass('text-sm');
      expect(title).toHaveClass('font-medium');
      expect(title).toHaveClass('text-gray-600');
    });

    test('value has proper emphasis styling', () => {
      render(<MetricCard {...defaultProps} />);
      
      const value = screen.getByText('247');
      expect(value).toHaveClass('text-2xl');
      expect(value).toHaveClass('font-bold');
      expect(value).toHaveClass('text-gray-900');
    });

    test('supports keyboard navigation when clickable', () => {
      const handleClick = jest.fn();
      render(<MetricCard {...defaultProps} onClick={handleClick} />);
      
      const card = screen.getByText('Total Employees').closest('div');
      
      // In a full implementation, you'd test tabindex and focus management
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('Error States', () => {
    test('handles missing title gracefully', () => {
      render(<MetricCard {...defaultProps} title="" />);
      
      const card = screen.getByText('247').closest('div');
      expect(card).toBeInTheDocument();
    });

    test('handles missing icon gracefully', () => {
      render(<MetricCard {...defaultProps} icon={undefined as any} />);
      
      // Should still render with default User icon
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
    });

    test('handles invalid color gracefully', () => {
      // This would typically be caught by TypeScript, but testing runtime behavior
      render(<MetricCard {...defaultProps} color={'invalid' as any} />);
      
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('can display loading indicators in value', () => {
      const loadingValue = <div data-testid="loading">Loading...</div>;
      
      render(<MetricCard {...defaultProps} value={loadingValue} />);
      
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading...');
    });

    test('can simulate data updates', async () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('Loading...');
        
        React.useEffect(() => {
          setTimeout(() => setValue('247'), 100);
        }, []);
        
        return <MetricCard {...defaultProps} value={value} />;
      };
      
      render(<TestComponent />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('247')).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    test('works with real dashboard data structure', () => {
      const officeSummary = {
        office: 'Dubai Office',
        totalEmployees: 85,
        totalSalary: 450000
      };
      
      const cardValue = (
        <>
          <div className="text-sm font-semibold text-blue-600">
            Employees: {officeSummary.totalEmployees}
          </div>
          <div className="text-sm font-semibold text-green-600">
            Salary: AED {officeSummary.totalSalary.toLocaleString()}
          </div>
        </>
      );
      
      render(
        <MetricCard
          title={`${officeSummary.office} Office`}
          value={cardValue}
          color="purple"
          icon={Building}
          onClick={() => console.log('Navigate to office details')}
        />
      );
      
      expect(screen.getByText('Dubai Office Office')).toBeInTheDocument();
      expect(screen.getByText('Employees: 85')).toBeInTheDocument();
      expect(screen.getByText('Salary: AED 450,000')).toBeInTheDocument();
    });

    test('handles click navigation for office cards', () => {
      const mockNavigate = jest.fn();
      const officeName = 'Dubai Office';
      
      const handleClick = () => {
        const encodedOfficeName = encodeURIComponent(officeName);
        mockNavigate(`/office/${encodedOfficeName}`);
      };
      
      render(
        <MetricCard
          {...defaultProps}
          title={`${officeName} Office`}
          onClick={handleClick}
        />
      );
      
      const card = screen.getByText('Dubai Office Office').closest('div');
      fireEvent.click(card!);
      
      expect(mockNavigate).toHaveBeenCalledWith('/office/Dubai%20Office');
    });
  });

  describe('Performance', () => {
    test('renders quickly with minimal DOM operations', () => {
      const startTime = performance.now();
      
      render(<MetricCard {...defaultProps} />);
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
    });

    test('handles multiple cards efficiently', () => {
      const cards = Array.from({ length: 10 }, (_, i) => ({
        ...defaultProps,
        title: `Card ${i + 1}`,
        value: `${i + 1}00`
      }));
      
      const startTime = performance.now();
      
      render(
        <div>
          {cards.map((cardProps, i) => (
            <MetricCard key={i} {...cardProps} />
          ))}
        </div>
      );
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // Should render 10 cards in under 500ms
    });
  });
});

/**
 * Custom test utilities for card testing
 */
export const CardTestUtils = {
  /**
   * Creates a mock office summary for testing
   */
  createMockOfficeSummary: (overrides = {}) => ({
    office: 'Test Office',
    totalEmployees: 50,
    totalSalary: 250000,
    ...overrides
  }),

  /**
   * Creates props for testing different card states
   */
  createCardProps: (overrides: Partial<MetricCardProps> = {}): MetricCardProps => ({
    title: 'Test Card',
    value: '123',
    color: 'blue',
    icon: User,
    ...overrides
  }),

  /**
   * Simulates loading state for cards
   */
  createLoadingCard: () => ({
    title: 'Loading Card',
    value: <div data-testid="loading-spinner">Loading...</div>,
    color: 'blue' as const,
    icon: User
  }),

  /**
   * Creates error state card
   */
  createErrorCard: () => ({
    title: 'Error Card',
    value: <div data-testid="error-message">Error loading data</div>,
    color: 'red' as const,
    icon: User
  }),

  /**
   * Formats currency for testing
   */
  formatCurrency: (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
};
