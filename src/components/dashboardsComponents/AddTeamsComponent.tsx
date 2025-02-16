import React, { useState, useEffect, memo } from 'react';
import { useQuery, useMutation } from 'react-query';
import { X, Loader2, Users } from 'lucide-react';
import { Team, Project } from '../../types';
import teamServices from '../../api/services/teamServices';
import projectServices from '../../api/services/projectServices';

interface AddTeamsComponentProps {
    organisationId: number | null;
    isEditing?: boolean;
    existingTeam?: Team;
    onClose?: () => void;
    onTeamAdded?: () => void;
}

const AddTeamsComponent: React.FC<AddTeamsComponentProps> = memo(({
    organisationId,
    isEditing = false,
    existingTeam,
    onClose,
    onTeamAdded
}) => {
    if (!organisationId) return null;

    const [isOpen, setIsOpen] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [projectId, setProjectId] = useState<number | null>(null);
    const [description, setDescription] = useState('');
    const [teamManagerId, setTeamManagerId] = useState<number | null>(null);

    useEffect(() => {
        if (isEditing && existingTeam) {
            setTeamName(existingTeam.name);
            setProjectId(existingTeam.projectId || null);
            setDescription(existingTeam.description || '');
            setTeamManagerId(existingTeam.teamManagerId || null);
            setIsOpen(true);
        }
    }, [isEditing, existingTeam]);

    const { data: projects = [], isLoading } = useQuery(
        'projects',
        projectServices.getProjects,
        {
            enabled: isOpen,
        }
    );

    const teamMutation = useMutation(
        async (teamData: Partial<Team>) => {
            if (isEditing && existingTeam?.teamId) {
                await teamServices.updateTeam(existingTeam.teamId, teamData as Team);

                if (existingTeam.projectId !== projectId) {
                    if (projectId !== null) {
                        await teamServices.assignTeamToProject(existingTeam.teamId, projectId);
                    } else if (existingTeam.projectId) {
                        await teamServices.removeTeamFromProject(existingTeam.teamId);
                    }
                }
                return teamData;
            } else {
                const newTeam = await teamServices.createTeam({
                    ...teamData,
                    createdAt: new Date().toISOString()
                } as Team);

                if (projectId !== null && newTeam.teamId) {
                    await teamServices.assignTeamToProject(newTeam.teamId, projectId);
                }
                return newTeam;
            }
        },
        {
            onSuccess: () => {
                onTeamAdded?.();
                resetForm();
                setIsOpen(false);
                onClose?.();
            },
            onError: () => {
                alert('Failed to save team');
            }
        }
    );

    const handleProjectChange = (newProjectId: string) => {
        setProjectId(newProjectId ? Number(newProjectId) : null);
    };

    const handleSubmit = async () => {
        if (!teamName.trim()) {
            alert('Team name is required');
            return;
        }

        const teamData: Partial<Team> = {
            name: teamName,
            organisationId,
            projectId: projectId || undefined,
            description: description || undefined,
            teamManagerId: teamManagerId || undefined,
            members: existingTeam?.members,
            createdAt: existingTeam?.createdAt,
            id: existingTeam?.id,
            teamId: existingTeam?.teamId,
        };

        teamMutation.mutate(teamData);
    };

    const resetForm = () => {
        setTeamName('');
        setProjectId(null);
        setDescription('');
        setTeamManagerId(null);
    };

    const handleClose = () => {
        setIsOpen(false);
        resetForm();
        onClose?.();
    };

    return (
        <>
            {!isEditing && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-black text-white px-4 py-2 rounded-3xl flex items-center hover:bg-gray-800 transition text-sm"
                >
                    <Users className="mr-2" size={18} />
                    Add Team
                </button>
            )}

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
                    onClick={handleClose}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">
                                {isEditing ? 'Edit Team' : 'Add New Team'}
                            </h2>
                            <button
                                onClick={handleClose}
                                className="text-gray-600 hover:text-gray-900 transition-colors rounded-full p-2 hover:bg-gray-200"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="teamName"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Team Name
                                </label>
                                <input
                                    id="teamName"
                                    type="text"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="Enter team name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                                    disabled={teamMutation.isLoading}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="project"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Project (Optional)
                                </label>
                                <select
                                    id="project"
                                    value={projectId || ""}
                                    onChange={(e) => handleProjectChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                                    disabled={isLoading || teamMutation.isLoading}
                                >
                                    <option value="">Select a project</option>
                                    {projects.map((project: Project) => (
                                        <option
                                            key={project.projectId ?? project.id}
                                            value={project.projectId ?? project.id}
                                        >
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="description"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Optional team description"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                                    rows={3}
                                    disabled={teamMutation.isLoading}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
                                disabled={teamMutation.isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={teamMutation.isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-black flex items-center"
                            >
                                {teamMutation.isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" size={14} />
                                        {isEditing ? 'Updating...' : 'Adding...'}
                                    </>
                                ) : (
                                    isEditing ? 'Update Team' : 'Add Team'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

AddTeamsComponent.displayName = "AddTeamsComponent";
export default AddTeamsComponent;