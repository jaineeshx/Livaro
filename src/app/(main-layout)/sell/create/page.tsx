'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import InteractiveProgressBar from '@/src/components/ui/InteractiveProgressBar';
import { useAutoSave } from '@/src/hooks/useAutoSave';

const FORM_STORAGE_KEY = 'sell-create-form-data';

export default function CreateListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('property_id');
  
  const [beds, setBeds] = useState('1');
  const [baths, setBaths] = useState('1');
  const [squareFootage, setSquareFootage] = useState('1500');
  const [propertyType, setPropertyType] = useState('apartment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Additional form fields for autosave
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [description, setDescription] = useState('');

  // Auto-save hook for existing properties (only when propertyId exists)
  const { saveImmediately } = useAutoSave({
    propertyId: propertyId, // Only auto-save when editing existing property
    formData: {
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      city: city,
      state: state,
      zip_code: zipCode,
      property_type: propertyType,
      bedrooms: beds,
      bathrooms: baths,
      square_footage: squareFootage,
      year_built: yearBuilt,
      description: description,
    },
    tableName: 'properties',
    debounceMs: 1500,
  });

  // Load form data from localStorage on mount
  useEffect(() => {
    const loadFormData = async () => {
      if (propertyId) {
        // Load existing property data from database
        try {
          const supabase = createClient();
          const { data: property, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single();
          
          if (!error && property) {
            setBeds(property.bedrooms?.toString() || '1');
            setBaths(property.bathrooms?.toString() || '1');
            setSquareFootage(property.square_footage?.toString() || '1500');
            setPropertyType(property.property_type || 'apartment');
            setAddressLine1(property.address_line_1 || '');
            setAddressLine2(property.address_line_2 || '');
            setCity(property.city || '');
            setState(property.state || '');
            setZipCode(property.zip_code || '');
            setYearBuilt(property.year_built?.toString() || '');
            setDescription(property.description || '');
          } else {
            console.log('No property data found or error occurred');
          }
        } catch (error) {
          console.error('Error loading property data:', error);
        }
      } else {
        console.log('No propertyId, loading from localStorage');
        // Load from localStorage for new properties
        const savedData = localStorage.getItem(FORM_STORAGE_KEY);
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            setBeds(parsed.beds || '1');
            setBaths(parsed.baths || '1');
            setSquareFootage(parsed.squareFootage || '1500');
            setPropertyType(parsed.propertyType || 'apartment');
            setAddressLine1(parsed.addressLine1 || '');
            setAddressLine2(parsed.addressLine2 || '');
            setCity(parsed.city || '');
            setState(parsed.state || '');
            setZipCode(parsed.zipCode || '');
            setYearBuilt(parsed.yearBuilt || '');
            setDescription(parsed.description || '');
          } catch (error) {
            console.error('Error loading saved form data:', error);
          }
        }
      }
    };
    
    loadFormData();
  }, [propertyId]);

  // Auto-save form data to localStorage whenever it changes
  useEffect(() => {
    // Only auto-save to localStorage for new properties
    if (propertyId) return;
    
    const formData = {
      beds,
      baths,
      squareFootage,
      propertyType,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      yearBuilt,
      description
    };
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
  }, [beds, baths, squareFootage, propertyType, addressLine1, addressLine2, city, state, zipCode, yearBuilt, description]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const supabase = createClient();
      
      if (propertyId) {
        // Update existing property
        console.log('Updating existing property:', propertyId);
        const propertyData = {
          address_line_1: formData.get('address_line_1') as string,
          address_line_2: formData.get('address_line_2') as string || null,
          city: formData.get('city') as string,
          state: formData.get('state') as string,
          zip_code: formData.get('zip_code') as string,
          property_type: formData.get('property_type') as string || 'apartment',
          bedrooms: parseInt(formData.get('bedrooms') as string),
          bathrooms: parseFloat(formData.get('bathrooms') as string),
          square_footage: parseInt(formData.get('square_footage') as string),
          description: formData.get('description') as string || null,
          year_built: formData.get('year_built') ? parseInt(formData.get('year_built') as string) : null,
        };

        // Force save via autosave hook first
        try {
          await saveImmediately();
          console.log('Auto-save completed successfully');
        } catch (autoSaveError) {
          console.error('Auto-save failed, trying direct update:', autoSaveError);
        }

        // Also do direct update to ensure data is saved
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', propertyId);

        if (error) {
          console.error('Error updating property:', error);
          alert('Error updating property. Please try again.');
          setIsSubmitting(false);
          return;
        }

        console.log('Property updated successfully, navigating to rent-details');
        router.push(`/sell/create/rent-details?property_id=${propertyId}`);
        
      } else {
        // Create new property
        // Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error('Authentication error:', authError);
          alert('Please sign in to create a property');
          setIsSubmitting(false);
          return;
        }

        // Step 1: find the customer record linked to the signed-in user
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (customerError || !customerData) {
          console.error('Customer record not found:', customerError);
          alert('Account profile not found. Please finish onboarding.');
          setIsSubmitting(false);
          return;
        }

        // Step 2: fetch the landlord record for that customer
        const { data: landlordRow, error: landlordRowError } = await supabase
          .from('landlords')
          .select('id')
          .eq('customer_id', customerData.id)
          .single();

        if (landlordRowError || !landlordRow) {
          console.error('Landlord profile not found:', landlordRowError);
          alert('Landlord profile not found. Please complete your onboarding.');
          setIsSubmitting(false);
          return;
        }

        const landlordId = landlordRow.id;
        
        // Extract form data
        const propertyData = {
          landlord_id: landlordId,
          address_line_1: formData.get('address_line_1') as string,
          address_line_2: formData.get('address_line_2') as string || null,
          city: formData.get('city') as string,
          state: formData.get('state') as string,
          zip_code: formData.get('zip_code') as string,
          property_type: formData.get('property_type') as string || 'apartment',
          bedrooms: parseInt(formData.get('bedrooms') as string),
          bathrooms: parseFloat(formData.get('bathrooms') as string),
          square_footage: parseInt(formData.get('square_footage') as string),
          description: formData.get('description') as string || null,
          year_built: formData.get('year_built') ? parseInt(formData.get('year_built') as string) : null,
        };

        // Insert the property
        const { data, error } = await supabase
          .from('properties')
          .insert([propertyData])
          .select();

        if (error) {
          console.error('Error creating property:', error);
          alert('Error creating property. Please try again.');
          setIsSubmitting(false);
          return;
        }

        console.log('Property created successfully:', data);
        
        // Clear saved form data on successful submission
        localStorage.removeItem(FORM_STORAGE_KEY);
        
        // Client-side redirect - much more reliable
        router.push(`/sell/create/rent-details?property_id=${data[0].id}`);
      }
      
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-28 pb-12 px-6 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">
            {propertyId ? 'Edit Property Information' : 'Property Information'}
          </h1>
          <button 
            onClick={async () => {
              // Save data before exiting if editing existing property
              if (propertyId) {
                try {
                  await saveImmediately();
                } catch (error) {
                  console.error('Error saving before exit:', error);
                }
              }
              router.push('/sell/dashboard');
            }}
            className="px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Save and Exit
          </button>
        </div>

        {/* Progress Bar */}
        <InteractiveProgressBar currentStep={0} propertyId={propertyId} beforeNavigate={saveImmediately} />

        {/* Form */}
        <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left Column - Basic Details */}
          <div>
            <h2 className="text-xl font-semibold mb-6">Basic Details</h2>
              
              {/* Property Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  name="property_type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                  required
                  disabled={isSubmitting}
                >
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="studio">Studio</option>
                  <option value="room">Room</option>
                  <option value="duplex">Duplex</option>
                </select>
              </div>

              {/* Address */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  name="address_line_1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                  placeholder="Enter street address"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="address_line_2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                  placeholder="Apt, suite, etc. (optional)"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                    placeholder="Enter city"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                    placeholder="State"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  name="zip_code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                  placeholder="Enter ZIP code"
                  required
                  disabled={isSubmitting}
                />
              </div>
            
            {/* Beds */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beds
              </label>
              <div className="relative">
                <select
                    name="bedrooms"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                    required
                    disabled={isSubmitting}
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bathrooms */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bathrooms
              </label>
              <div className="relative">
                <select
                    name="bathrooms"
                  value={baths}
                  onChange={(e) => setBaths(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                    required
                    disabled={isSubmitting}
                >
                  <option value="0.5">0.5 bathroom</option>
                  <option value="1">1 bathroom</option>
                  <option value="1.5">1.5 bathrooms</option>
                  <option value="2">2 bathrooms</option>
                  <option value="2.5">2.5 bathrooms</option>
                  <option value="3">3 bathrooms</option>
                  <option value="3.5">3.5 bathrooms</option>
                  <option value="4">4 bathrooms</option>
                  <option value="4.5">4.5 bathrooms</option>
                  <option value="5">5+ bathrooms</option>
                </select>
              </div>
            </div>

            {/* Square Footage */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Square Footage
              </label>
              <input
                type="number"
                  name="square_footage"
                value={squareFootage}
                onChange={(e) => setSquareFootage(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                placeholder="Enter square footage"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Year Built */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year Built (Optional)
                </label>
                <input
                  type="number"
                  name="year_built"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  min="1800"
                  max={new Date().getFullYear()}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-blue-50"
                  placeholder="Enter year built"
                  disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Right Column - Property Description */}
          <div>
            <h2 className="text-xl font-semibold mb-6">Describe Your Property</h2>
            <p className="text-gray-600 mb-4">What makes your place unique?</p>
            <textarea
                name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-[250px] p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
              placeholder="Describe your property..."
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Next Button */}
        <div className="flex justify-end mt-8">
          <button 
              type="submit"
              disabled={isSubmitting}
            className={`px-8 py-3 rounded-lg transition-colors ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {isSubmitting ? (propertyId ? 'Updating Property...' : 'Creating Property...') : 'Next'}
          </button>
        </div>
        </div>
        </form>
      </div>
    </main>
  );
}