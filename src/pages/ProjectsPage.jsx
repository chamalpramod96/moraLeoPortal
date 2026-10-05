import { useState, useEffect, useCallback } from 'react';
import { useAuth }        from '../context/AuthContext';
import { useToast }       from '../context/ToastContext';
import ConfirmDialog      from '../components/ConfirmDialog';
import LoadingSpinner     from '../components/LoadingSpinner';
import ProjectCard        from './projects/ProjectCard';
import ProjectFormModal   from './projects/ProjectFormModal';
import { getProjects, deleteProject } from '../services/projectService';
import { getMembers }     from '../services/memberService';
import { refreshLeaderboardSoon } from '../services/leaderboardService';
import { memberKey }      from '../utils/helpers';

/**
 * Projects — visible to all members. Admins add/edit/delete projects and set
 * the Chairperson, Secretary and Treasurer; each role adds points to that
 * member's total (see PROJECT_ROLES).
 */
function ProjectsPage() {
  const { memberData, isAdmin } = useAuth();
  const { showToast }           = useToast();

  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [myKey,    setMyKey]    = useState(null);

  // Admin-only data for the role pickers
  const [members,  setMembers]  = useState([]);           // active, sorted
  const [keyToEmail, setKeyToEmail] = useState({});

  const [editing,  setEditing]  = useState(null);         // null | 'new' | project
  const [delItem,  setDelItem]  = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, key] = await Promise.all([getProjects(), memberKey(memberData?.email)]);
      setProjects(list);
      setMyKey(key);
      if (isAdmin) {
        const all    = await getMembers();
        const active = all.filter(m => m.isActive)
                          .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
        const keys   = await Promise.all(active.map(m => memberKey(m.email)));
        setMembers(active);
        setKeyToEmail(Object.fromEntries(keys.map((k, i) => [k, active[i].email])));
      }
    } catch {
      showToast('Could not load projects.', 'error');
    } finally {
      setLoading(false);
    }
  }, [memberData?.email, isAdmin, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    const p = delItem;
    setDelItem(null);
    try {
      await deleteProject(p);
      showToast(`"${p.name}" deleted.`, 'success');
      refreshLeaderboardSoon();
      load();
    } catch {
      showToast('Delete failed. Please try again.', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-portal-text flex items-center gap-2">
            <i className="fa-solid fa-diagram-project text-portal-gold" />
            Projects
          </h1>
          <p className="text-portal-muted text-xs mt-0.5">
            Club projects and their officers — project roles earn Mora Connect points
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing('new')}
            className="sm:ml-auto bg-portal-red hover:bg-portal-red-dark text-white font-semibold
                       px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
            <i className="fa-solid fa-plus" /> Add Project
          </button>
        )}
      </div>

      {/* Project cards */}
      {projects.length === 0 ? (
        <div className="card rounded-xl p-10 text-center">
          <i className="fa-solid fa-diagram-project text-4xl text-portal-muted/40 mb-3" />
          <p className="text-portal-muted text-sm">No projects yet.</p>
          {isAdmin && <p className="text-portal-muted/70 text-xs mt-1">Use “Add Project” to add the first one.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} myKey={myKey} isAdmin={isAdmin}
                         onEdit={setEditing} onDelete={setDelItem} />
          ))}
        </div>
      )}

      {/* Add / edit modal (admins) — mounted fresh for each project */}
      {editing && (
        <ProjectFormModal
          key={editing === 'new' ? 'new' : editing.id}
          project={editing === 'new' ? null : editing}
          members={members}
          keyToEmail={keyToEmail}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        isOpen={!!delItem}
        isDanger
        title="Delete Project"
        message={`Delete "${delItem?.name}"? Its officers will lose the points from this project.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDelItem(null)}
      />
    </div>
  );
}

export default ProjectsPage;
