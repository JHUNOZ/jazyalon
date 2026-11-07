import React from 'react';
import { Instagram, Heart } from 'lucide-react';
import VictorianDivider from '../common/VictorianDivider';
import { BRAND_INFO } from '../../data/mockData';

export default function InstagramFeed() {
  const posts = [
    { id: 1, image: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=500&auto=format&fit=crop', likes: '1.4k' },
    { id: 2, image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=500&auto=format&fit=crop', likes: '890' },
    { id: 3, image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=500&auto=format&fit=crop', likes: '2.1k' },
    { id: 4, image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=500&auto=format&fit=crop', likes: '1.2k' },
    { id: 5, image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=500&auto=format&fit=crop', likes: '1.7k' },
    { id: 6, image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=500&auto=format&fit=crop', likes: '980' }
  ];

  return (
    <section className="py-4 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <VictorianDivider 
        title="Instagram" 
        subtitle="@jazyalon.cl" 
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        {posts.map((post) => (
          <a
            key={post.id}
            href="https://instagram.com/jazyalon.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square rounded-xl overflow-hidden border border-luxury-border shadow-luxury-sm transition-all duration-500 hover:shadow-lg hover:-translate-y-1"
          >
            <img
              src={post.image}
              alt="Instagram jazyalon.cl"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[2px]">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Heart className="w-3.5 h-3.5 fill-white" />
                <span>{post.likes}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
