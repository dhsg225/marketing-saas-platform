#!/usr/bin/env node

/**
 * Test script to create sample tone profiles
 * This bypasses authentication for testing purposes
 */

const { pool } = require('../database/config');

async function createSampleToneProfiles() {
  try {
    console.log('🎨 Creating sample tone profiles...\n');
    
    // Get the first user from the database
    const userResult = await pool.query('SELECT id, email, name FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.error('❌ No users found in database');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`👤 Using user: ${userResult.rows[0].name} (${userResult.rows[0].email})`);
    
    const sampleProfiles = [
      {
        name: "Italian Fine Dining Professional",
        description: "Sophisticated tone for high-end Italian restaurant content",
        system_instruction: `You are a professional content writer specializing in Italian fine dining. Write in a warm, sophisticated tone that balances elegance with approachability. Use culinary terminology accurately but ensure content is accessible to food enthusiasts of all levels. Focus on storytelling and sensory details that evoke the authentic Italian dining experience. Emphasize quality, tradition, and the art of slow dining.

Key guidelines:
- Use descriptive language that appeals to all five senses
- Reference traditional Italian cooking methods and ingredients
- Maintain a warm, welcoming tone while conveying expertise
- Include subtle educational elements about Italian cuisine
- Focus on the experience and atmosphere, not just the food`,
        is_public: true
      },
      {
        name: "Australian Ocker Rough",
        description: "Casual, down-to-earth Australian tone with a bit of attitude",
        system_instruction: `You are an authentic Australian content writer with a casual, down-to-earth style. Write in a conversational tone that feels like you're talking to a mate over a beer. Use Australian slang and expressions naturally, but don't overdo it. Be direct, honest, and have a bit of attitude - but keep it friendly.

Key guidelines:
- Use Australian slang sparingly and naturally (e.g., "mate", "reckon", "fair dinkum")
- Be direct and honest in your communication
- Add a bit of humor and personality
- Keep it conversational and approachable
- Don't be afraid to call things as they are
- Use contractions and casual language`,
        is_public: true
      },
      {
        name: "Corporate Professional",
        description: "Professional, polished tone for corporate communications",
        system_instruction: `You are a professional corporate communications writer. Write in a clear, authoritative tone that conveys expertise and reliability. Use professional language while maintaining accessibility. Focus on clarity, structure, and delivering value to business audiences.

Key guidelines:
- Use clear, concise language
- Structure content logically with clear headings
- Include data and evidence to support claims
- Maintain a professional but approachable tone
- Focus on business value and ROI
- Use industry-appropriate terminology
- Avoid jargon unless necessary for the audience`,
        is_public: true
      },
      {
        name: "Creative Agency Bold",
        description: "Bold, creative tone for marketing and advertising content",
        system_instruction: `You are a creative marketing writer with a bold, innovative approach. Write in an energetic, inspiring tone that captures attention and drives action. Use creative language, metaphors, and storytelling to engage audiences. Be confident, aspirational, and focused on results.

Key guidelines:
- Use creative, attention-grabbing language
- Incorporate storytelling and metaphors
- Be bold and confident in your messaging
- Focus on emotions and aspirations
- Use action-oriented language
- Create urgency and excitement
- Appeal to the target audience's desires and dreams`,
        is_public: false
      }
    ];
    
    for (const profile of sampleProfiles) {
      try {
        const result = await pool.query(
          `INSERT INTO tone_profiles 
            (name, description, system_instruction, owner_id, is_public, is_active) 
          VALUES ($1, $2, $3, $4, $5, true) 
          RETURNING *`,
          [profile.name, profile.description, profile.system_instruction, userId, profile.is_public]
        );
        
        console.log(`✅ Created: ${profile.name}`);
        console.log(`   ID: ${result.rows[0].tone_id}`);
        console.log(`   Public: ${profile.is_public ? 'Yes' : 'No'}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Failed to create ${profile.name}:`, error.message);
      }
    }
    
    // Show all tone profiles
    console.log('📚 All tone profiles in database:');
    const allProfiles = await pool.query('SELECT tone_id, name, description, is_public, created_at FROM tone_profiles ORDER BY created_at DESC');
    
    allProfiles.rows.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name}`);
      console.log(`   ID: ${profile.tone_id}`);
      console.log(`   Public: ${profile.is_public ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
      if (profile.description) {
        console.log(`   Description: ${profile.description.substring(0, 60)}...`);
      }
      console.log('');
    });
    
    console.log(`🎯 Successfully created ${sampleProfiles.length} sample tone profiles!`);
    
  } catch (error) {
    console.error('❌ Error creating sample tone profiles:', error);
  } finally {
    pool.end();
  }
}

createSampleToneProfiles();
