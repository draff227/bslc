'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import 'choices.js/public/assets/styles/choices.min.css';
import { stationsConfig } from '@/config/stations';
import { CalculatePriceRequest, CalculatePriceResponse, Station, ApiError } from '@/types';

export default function DeliveryCalculator() {
  const [pickupStation, setPickupStation] = useState<string>(stationsConfig.defaultPickupStation);
  const [destinationStation, setDestinationStation] = useState<string>(stationsConfig.defaultDestinationStation);
  const [volume, setVolume] = useState<string>('');
  const [collateral, setCollateral] = useState<string>('');
  const [deliveryCost, setDeliveryCost] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copiedCost, setCopiedCost] = useState<boolean>(false);
  const [copiedCompany, setCopiedCompany] = useState<boolean>(false);

  const pickupSelectRef = useRef<HTMLSelectElement>(null);
  const destinationSelectRef = useRef<HTMLSelectElement>(null);
  const pickupChoicesRef = useRef<InstanceType<typeof import('choices.js').default> | null>(null);
  const destinationChoicesRef = useRef<InstanceType<typeof import('choices.js').default> | null>(null);

  const calculateDeliveryPrice = useCallback(async () => {
    if (!pickupStation || !destinationStation || !volume) {
      setError('Please fill in all required fields');
      return;
    }

    const volumeNum = parseInt(volume);
    const collateralNum = parseInt(collateral) || 0;

    if (isNaN(volumeNum) || volumeNum <= 0 || volumeNum > stationsConfig.maxVolume) {
      setError(`Volume must be between 1 and ${formatNumber(stationsConfig.maxVolume)} m³`);
      return;
    }

    if (collateralNum < 0 || collateralNum > stationsConfig.maxCollateral) {
      setError(`Collateral must be between 0 and ${formatNumber(stationsConfig.maxCollateral)} ISK`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requestData: CalculatePriceRequest = {
        pickupStationId: pickupStation,
        destinationStationId: destinationStation,
        volume: volumeNum,
        collateral: collateralNum
      };

      const response = await fetch('/api/calculate-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const data: CalculatePriceResponse = await response.json();
        setDeliveryCost(data.totalPrice);
      } else {
        const errorData: ApiError = await response.json();
        setError(errorData.error || 'Failed to calculate price');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Calculation error:', err);
    } finally {
      setLoading(false);
    }
  }, [pickupStation, destinationStation, volume, collateral]);

  useEffect(() => {
    if (pickupStation && destinationStation && volume) {
      calculateDeliveryPrice();
    } else {
      setDeliveryCost(null);
    }
  }, [pickupStation, destinationStation, volume, collateral, calculateDeliveryPrice]);

  useEffect(() => {
    const initializeChoices = async () => {
      // Dynamic import to avoid SSR issues
      const { default: Choices } = await import('choices.js');
      
      if (pickupSelectRef.current && destinationSelectRef.current) {
        // Initialize Choices.js for pickup station
        pickupChoicesRef.current = new Choices(pickupSelectRef.current, {
          searchEnabled: true,
          allowHTML: false,
          placeholderValue: 'Search for pickup station...',
          searchPlaceholderValue: 'Type to search...',
          noResultsText: 'No stations found',
          shouldSort: false,
        });

        // Initialize Choices.js for destination station
        destinationChoicesRef.current = new Choices(destinationSelectRef.current, {
          searchEnabled: true,
          allowHTML: false,
          placeholderValue: 'Search for destination station...',
          searchPlaceholderValue: 'Type to search...',
          noResultsText: 'No stations found',
          shouldSort: false,
        });

        // Set initial values if they exist
        if (pickupStation) {
          pickupChoicesRef.current.setChoiceByValue(pickupStation);
        }
        if (destinationStation) {
          destinationChoicesRef.current.setChoiceByValue(destinationStation);
        }

        // Handle pickup station changes
        pickupSelectRef.current.addEventListener('change', (event: Event) => {
          const target = event.target as HTMLSelectElement;
          setPickupStation(target.value);
        });

        // Handle destination station changes
        destinationSelectRef.current.addEventListener('change', (event: Event) => {
          const target = event.target as HTMLSelectElement;
          setDestinationStation(target.value);
        });
      }
    };

    initializeChoices();

    return () => {
      // Cleanup Choices.js instances
      if (pickupChoicesRef.current) {
        pickupChoicesRef.current.destroy();
        pickupChoicesRef.current = null;
      }
      if (destinationChoicesRef.current) {
        destinationChoicesRef.current.destroy();
        destinationChoicesRef.current = null;
      }
    };
  }, [destinationStation, pickupStation]);

  const formatNumber = (num: number): string => {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const formatInputNumber = (value: string): string => {
    const cleanNumber = value.replace(/\s/g, '');
    if (!cleanNumber || isNaN(Number(cleanNumber))) return value;
    return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\s/g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      setVolume(rawValue);
    }
  };

  const handleVolumePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const numericValue = parseFloat(pastedText.replace(/\s/g, ''));
    if (!isNaN(numericValue) && numericValue >= 0) {
      const integerValue = Math.floor(numericValue).toString();
      setVolume(integerValue);
    }
  };

  const handleCollateralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\s/g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      setCollateral(rawValue);
    }
  };

  const handleCollateralPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const numericValue = parseFloat(pastedText.replace(/\s/g, ''));
    if (!isNaN(numericValue) && numericValue >= 0) {
      const integerValue = Math.floor(numericValue).toString();
      setCollateral(integerValue);
    }
  };

  const getPricePerM3 = (): number => {
    if (!pickupStation || !destinationStation) return 0;
    return stationsConfig.priceMatrix[pickupStation]?.[destinationStation] || 0;
  };

  const copyToClipboard = async (text: string, type: 'cost' | 'company') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'cost') {
        setCopiedCost(true);
        setTimeout(() => setCopiedCost(false), 2000);
      } else {
        setCopiedCompany(true);
        setTimeout(() => setCopiedCompany(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const CopyIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  return (
    <>
      <style jsx global>{`
        .choices {
          margin-bottom: 0;
        }
        .choices__inner {
          background-color: rgb(55 65 81) !important;
          border: 1px solid rgb(75 85 99) !important;
          color: white !important;
          padding: 8px 12px !important;
          border-radius: 6px !important;
          min-height: 42px !important;
        }
        .choices__input {
          background-color: transparent !important;
          color: white !important;
        }
        .choices__input::placeholder {
          color: rgb(156 163 175) !important;
        }
        .choices__list--dropdown {
          background-color: rgb(55 65 81) !important;
          border: 1px solid rgb(75 85 99) !important;
        }
        .choices__item--choice {
          color: white !important;
          background-color: rgb(55 65 81) !important;
        }
        .choices__item--choice:hover,
        .choices__item--choice.is-highlighted {
          background-color: rgb(75 85 99) !important;
        }
        .choices__item--choice.is-selected {
          background-color: rgb(59 130 246) !important;
        }
        .choices__item {
          color: white !important;
        }
        .choices[data-type*="select-one"] .choices__item {
          color: white !important;
        }
        .choices__placeholder {
          color: rgb(156 163 175) !important;
        }
      `}</style>
      <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-6">
          <Image 
            src="/logo.png" 
            alt="Black Sky Logistics Company Logo" 
            width={80} 
            height={80}
            className="rounded"
            style={{width: 'auto', height: 'auto'}}
          />
        </div>
        <div className="bg-gray-800 rounded-lg p-6 space-y-6">
          
          <div>
            <label htmlFor="pickup-station" className="block text-sm font-medium text-gray-300 mb-2">
              Pick up station
            </label>
            <select
              ref={pickupSelectRef}
              id="pickup-station"
              value={pickupStation}
              onChange={(e) => setPickupStation(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select pickup station</option>
              {stationsConfig.stations.map((station: Station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="destination-station" className="block text-sm font-medium text-gray-300 mb-2">
              Destination
            </label>
            <select
              ref={destinationSelectRef}
              id="destination-station"
              value={destinationStation}
              onChange={(e) => setDestinationStation(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select destination station</option>
              {stationsConfig.stations.map((station: Station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="volume" className="block text-sm font-medium text-gray-300 mb-2">
              Volume m³ [max : {formatNumber(stationsConfig.maxVolume)} m³]
            </label>
            <input
              type="text"
              id="volume"
              value={formatInputNumber(volume)}
              onChange={handleVolumeChange}
              onPaste={handleVolumePaste}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter volume in m³"
            />
          </div>

          <div>
            <label htmlFor="collateral" className="block text-sm font-medium text-gray-300 mb-2">
              Collateral (required)
            </label>
            <input
              type="text"
              id="collateral"
              value={formatInputNumber(collateral)}
              onChange={handleCollateralChange}
              onPaste={handleCollateralPaste}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter collateral value"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Delivery cost {pickupStation && destinationStation ? (
                <span className="text-gray-400 font-normal">
                  {formatNumber(getPricePerM3())} ISK / m³ + 1% of collateral
                </span>
              ) : null}
            </label>
            <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white min-h-[2.5rem] flex items-center justify-between">
              <div className="flex items-center">
                {loading ? (
                  <span className="text-gray-400">Calculating...</span>
                ) : deliveryCost !== null ? (
                  <span className="text-green-400 font-semibold">
                    {formatNumber(deliveryCost)} ISK
                  </span>
                ) : (
                  <span className="text-gray-500">Enter details above to calculate</span>
                )}
              </div>
              {deliveryCost !== null && (
                <div className="relative">
                  <button
                    onClick={() => copyToClipboard(formatNumber(deliveryCost), 'cost')}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                  >
                    <CopyIcon />
                  </button>
                  {copiedCost && (
                    <div className="absolute right-0 top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
                      Copied!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="text-gray-400 text-sm mt-6">
            <div className="flex items-center justify-between text-gray-400 text-sm">
              <span>Private contract on: <span className="text-white">Black Sky Logistics Company</span></span>
              <div className="relative ml-2">
                <button
                  onClick={() => copyToClipboard('Black Sky Logistics Company', 'company')}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  <CopyIcon />
                </button>
                {copiedCompany && (
                  <div className="absolute right-0 top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
                    Copied!
                  </div>
                )}
              </div>
            </div>
            <p>Expiration: <span className="text-white">3 Days</span></p>
            <p>Days to complete: <span className="text-white">7</span></p>
            <div className="mt-4">
              <Image 
                src="/corp-info.png" 
                alt="Black Sky Logistics Company Corporation Information" 
                width={700} 
                height={400}
                className="w-full h-auto rounded border border-gray-600" 
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}