import { supabase } from './supabase';
import type { Section } from '../types';

export async function createSection(sessionId: string, sectionName: string, semesterNumber: 7 | 8): Promise<Section> {
  const { data, error } = await supabase
    .from('sections')
    .insert({ session_id: sessionId, section_name: sectionName, semester_number: semesterNumber })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A section with this name already exists in this session.');
    throw new Error(error.message);
  }

  return data as Section;
}

export async function listSections(sessionId?: string): Promise<Section[]> {
  let query = supabase.from('sections').select('*');
  if (sessionId) query = query.eq('session_id', sessionId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Section[];
}

export async function updateSection(id: string, sectionName: string, semesterNumber: 7 | 8): Promise<Section> {
  const { data, error } = await supabase
    .from('sections')
    .update({ section_name: sectionName, semester_number: semesterNumber })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A section with this name already exists in this session.');
    throw new Error(error.message);
  }

  return data as Section;
}

export async function deleteSection(id: string): Promise<void> {
  const { error } = await supabase.from('sections').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
