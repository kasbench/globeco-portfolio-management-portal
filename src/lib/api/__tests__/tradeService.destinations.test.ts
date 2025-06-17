import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { TradeService } from '../tradeService';
import { DestinationResponseDTO } from '@/types/trade';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('TradeService - Destinations', () => {
  let tradeService: TradeService;
  let mockAxiosInstance: any;

  const mockDestinations: DestinationResponseDTO[] = [
    {
      id: 1,
      abbreviation: 'NYSE',
      description: 'New York Stock Exchange',
      version: 1
    },
    {
      id: 2,
      abbreviation: 'NASDAQ',
      description: 'NASDAQ Stock Market',
      version: 1
    },
    {
      id: 3,
      abbreviation: 'LSE',
      description: 'London Stock Exchange',
      version: 1
    }
  ];

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create new TradeService instance
    tradeService = new TradeService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDestinations', () => {
    it('should fetch all destinations successfully', async () => {
      // Arrange
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockDestinations
      });

      // Act
      const result = await tradeService.getDestinations();

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/destinations');
      expect(result).toEqual(mockDestinations);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: 1,
        abbreviation: 'NYSE',
        description: 'New York Stock Exchange'
      });
    });

    it('should handle empty destinations array', async () => {
      // Arrange
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: []
      });

      // Act
      const result = await tradeService.getDestinations();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(tradeService.getDestinations()).rejects.toThrow(
        'Unable to load destinations. Please try again.'
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/destinations');
    });

    it('should handle 404 errors appropriately', async () => {
      // Arrange
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(tradeService.getDestinations()).rejects.toThrow(
        'Unable to load destinations. Please try again.'
      );
    });

    it('should handle 500 errors appropriately', async () => {
      // Arrange
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(tradeService.getDestinations()).rejects.toThrow(
        'Unable to load destinations. Please try again.'
      );
    });
  });

  describe('getDestinationById', () => {
    it('should fetch destination by ID successfully', async () => {
      // Arrange
      const destinationId = 1;
      const mockDestination = mockDestinations[0];
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockDestination
      });

      // Act
      const result = await tradeService.getDestinationById(destinationId);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/destinations/1');
      expect(result).toEqual(mockDestination);
      expect(result.id).toBe(destinationId);
    });

    it('should handle not found errors', async () => {
      // Arrange
      const destinationId = 999;
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Destination not found' }
        }
      };
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(tradeService.getDestinationById(destinationId)).rejects.toThrow(
        'Unable to load destination. Please try again.'
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/destinations/999');
    });

    it('should handle invalid ID types', async () => {
      // Arrange
      const invalidId = 0;
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invalid ID' }
        }
      };
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(tradeService.getDestinationById(invalidId)).rejects.toThrow(
        'Unable to load destination. Please try again.'
      );
    });
  });

  describe('error handling', () => {
    it('should log errors to console', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Test error');
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);

      // Act
      try {
        await tradeService.getDestinations();
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch destinations:', mockError);
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle network timeouts', async () => {
      // Arrange
      const timeoutError = new Error('timeout of 30000ms exceeded');
      timeoutError.name = 'ECONNABORTED';
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);

      // Act & Assert
      await expect(tradeService.getDestinations()).rejects.toThrow(
        'Unable to load destinations. Please try again.'
      );
    });
  });
}); 