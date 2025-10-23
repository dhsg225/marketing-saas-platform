// Vercel API function for AI-Powered Prompt Refinement
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method } = req;
    
    // Health check endpoint
    if (req.url === '/api/prompt-refinement/health' || req.url === '/api/prompt-refinement') {
      return res.status(200).json({ 
        status: 'healthy', 
        service: 'prompt-refinement',
        timestamp: new Date().toISOString()
      });
    }

    switch (method) {
      case 'POST':
        return await handleCreateSession(req, res);
      case 'PUT':
        return await handleRefinePrompt(req, res);
      case 'GET':
        return await handleGetSession(req, res);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ Prompt refinement error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Create a new prompt refinement session
async function handleCreateSession(req, res) {
  const { postId, contentIdeaId, originalPrompt, userId } = req.body;

  if (!originalPrompt) {
    return res.status(400).json({
      success: false,
      error: 'Original prompt is required'
    });
  }

  if (!postId && !contentIdeaId) {
    return res.status(400).json({
      success: false,
      error: 'Either postId or contentIdeaId is required'
    });
  }

  try {
    // Create new refinement session
    const { data: session, error: sessionError } = await supabase
      .from('prompt_refinement_sessions')
      .insert({
        post_id: postId || null,
        content_idea_id: contentIdeaId || null,
        original_prompt: originalPrompt,
        current_prompt: originalPrompt,
        created_by: userId,
        session_status: 'active'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Session creation error:', sessionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create refinement session'
      });
    }

    console.log('✅ Created refinement session:', session.id);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        originalPrompt: session.original_prompt,
        currentPrompt: session.current_prompt,
        status: session.session_status
      }
    });

  } catch (error) {
    console.error('❌ Create session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create refinement session'
    });
  }
}

// Refine prompt based on feedback
async function handleRefinePrompt(req, res) {
  const { sessionId, feedback, manualEdit, userId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required'
    });
  }

  try {
    // Get current session
    const { data: session, error: sessionError } = await supabase
      .from('prompt_refinement_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    let refinedPrompt = session.current_prompt;
    let aiConfidence = 0.0;

    // If manual edit provided, use it directly
    if (manualEdit) {
      refinedPrompt = manualEdit;
    } else if (feedback) {
      // Use AI to refine the prompt based on feedback
      const aiRefinement = await refinePromptWithAI(
        session.current_prompt,
        feedback,
        session.original_prompt
      );
      
      refinedPrompt = aiRefinement.refinedPrompt;
      aiConfidence = aiRefinement.confidence;
    }

    // Get next iteration number
    const { data: iterations } = await supabase
      .from('prompt_iterations')
      .select('iteration_number')
      .eq('session_id', sessionId)
      .order('iteration_number', { ascending: false })
      .limit(1);

    const nextIterationNumber = iterations && iterations.length > 0 
      ? iterations[0].iteration_number + 1 
      : 2;

    // Create new iteration
    const { data: iteration, error: iterationError } = await supabase
      .from('prompt_iterations')
      .insert({
        session_id: sessionId,
        iteration_number: nextIterationNumber,
        prompt_text: refinedPrompt,
        iteration_type: manualEdit ? 'manual_edit' : 'ai_refined',
        ai_confidence: aiConfidence,
        generation_metadata: {
          feedback: feedback,
          original_prompt: session.original_prompt,
          previous_prompt: session.current_prompt,
          refined_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (iterationError) {
      console.error('❌ Iteration creation error:', iterationError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create prompt iteration'
      });
    }

    // Store feedback if provided
    if (feedback) {
      await supabase
        .from('prompt_feedback')
        .insert({
          session_id: sessionId,
          feedback_type: 'client_feedback',
          feedback_text: feedback,
          ai_suggested_prompt: refinedPrompt,
          feedback_author: userId
        });
    }

    // Update session with new current prompt
    await supabase
      .from('prompt_refinement_sessions')
      .update({
        current_prompt: refinedPrompt,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    console.log('✅ Refined prompt for session:', sessionId);

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        iterationId: iteration.id,
        refinedPrompt: refinedPrompt,
        aiConfidence: aiConfidence,
        iterationNumber: nextIterationNumber,
        feedback: feedback,
        isManualEdit: !!manualEdit
      }
    });

  } catch (error) {
    console.error('❌ Refine prompt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refine prompt'
    });
  }
}

// Get session details and history
async function handleGetSession(req, res) {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required'
    });
  }

  try {
    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('prompt_refinement_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get all iterations
    const { data: iterations, error: iterationsError } = await supabase
      .from('prompt_iterations')
      .select('*')
      .eq('session_id', sessionId)
      .order('iteration_number', { ascending: true });

    if (iterationsError) {
      console.error('❌ Iterations fetch error:', iterationsError);
    }

    // Get all feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('prompt_feedback')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (feedbackError) {
      console.error('❌ Feedback fetch error:', feedbackError);
    }

    res.json({
      success: true,
      data: {
        session: session,
        iterations: iterations || [],
        feedback: feedback || [],
        totalIterations: iterations ? iterations.length : 0
      }
    });

  } catch (error) {
    console.error('❌ Get session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session details'
    });
  }
}

// AI-powered prompt refinement using OpenAI
async function refinePromptWithAI(originalPrompt, feedback, basePrompt) {
  try {
    const systemPrompt = `You are an expert AI image prompt engineer. Your job is to refine image generation prompts based on client feedback while maintaining the original creative vision.

Guidelines:
1. Preserve the core concept and style of the original prompt
2. Address the specific feedback provided
3. Use professional, descriptive language for image generation
4. Maintain technical accuracy for AI image models
5. Keep prompts concise but detailed enough for good results
6. Consider composition, lighting, style, and mood

Return your refined prompt and a confidence score (0.0 to 1.0) indicating how well you addressed the feedback.`;

    const userPrompt = `
ORIGINAL PROMPT: "${basePrompt}"
CURRENT PROMPT: "${originalPrompt}"
CLIENT FEEDBACK: "${feedback}"

Please refine the current prompt to address the client feedback while preserving the original creative vision. Return your response as JSON with "refinedPrompt" and "confidence" fields.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const response = completion.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(response);
      return {
        refinedPrompt: parsed.refinedPrompt || originalPrompt,
        confidence: Math.max(0.0, Math.min(1.0, parsed.confidence || 0.5))
      };
    } catch (parseError) {
      // If JSON parsing fails, extract the prompt from the response
      const refinedPrompt = response.replace(/```json|```/g, '').trim();
      return {
        refinedPrompt: refinedPrompt || originalPrompt,
        confidence: 0.6 // Default confidence
      };
    }

  } catch (error) {
    console.error('❌ AI refinement error:', error);
    return {
      refinedPrompt: originalPrompt,
      confidence: 0.0
    };
  }
}
