import React, { useEffect, useState, useRef } from "react";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../api";
import ProjectCard from "../components/ProjectCard";
import ProjectModal from "../components/ProjectModal";
import TasksModal from "../components/TasksModal";
import ProfileMenu from "../components/ProfileMenu";
import InvitationsBell from "../components/InvitationsBell";
import NotificationsBell from "../components/NotificationsBell";
import SettingsMenu from "../components/SettingsMenu";
import Kanban from "../components/Kanban";
import styles from "./Dashboard.module.css";
import { useI18n } from "../context/I18nContext.jsx";
import { useAuthApi } from "../context/authApi";

export default function Dashboard() {
  const { t } = useI18n();
  const auth = useAuthApi();
  const user = typeof auth.getUser === 'function' ? auth.getUser() : auth.user;
  const [projects, setProjects] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [filterStatus, setFilterStatus] = useState(
    localStorage.getItem("filterStatus") || ""
  );
  const [filterPriority, setFilterPriority] = useState(
    localStorage.getItem("filterPriority") || ""
  );
  const [filterLabel, setFilterLabel] = useState(
    localStorage.getItem("filterLabel") || ""
  );
  const [activeFilters, setActiveFilters] = useState(0);
  const [openMenu, setOpenMenu] = useState(null); // 'notifications' | 'invitations' | 'profile' | 'settings' | null
  const projectsListRef = useRef(null);
  const headerRef = useRef(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    localStorage.setItem("filterStatus", filterStatus);
    localStorage.setItem("filterPriority", filterPriority);
    localStorage.setItem("filterLabel", filterLabel);
    
    // Підрахунок активних фільтрів
    let count = 0;
    if (filterStatus) count++;
    if (filterPriority) count++;
    if (filterLabel) count++;
    setActiveFilters(count);
  }, [filterStatus, filterPriority, filterLabel]);

  useEffect(() => {
    // GSAP анімації - запускаємо лише один раз
    if (animatedRef.current || !window.gsap || !window.ScrollTrigger) return;
    
    window.gsap.registerPlugin(window.ScrollTrigger);








































































































































































}  );    </div>      </div>        />          }}            label: filterLabel,            priority: filterPriority,          filters={{
n            status: filterStatus,          project={selectedProject}          onClose={() => setTasksOpen(false)}          open={tasksOpen}        <TasksModal        />          initialData={modalData}          onSubmit={handleModalSubmit}          onClose={() => setModalOpen(false)}          open={modalOpen}        <ProjectModal        )}          </div>            />              }}                label: filterLabel,                priority: filterPriority,                status: filterStatus,              filters={{              project={selectedProject}            <Kanban            </h3>              {t('kanbanBoard')}: {selectedProject.name}            <h3 className={styles.kanbanTitle}>          <div className={styles.kanbanSection}>        {selectedProject && (        )}          </div>            ))}              </div>                />                  onOpen={handleOpenTasks}                  onDelete={handleDelete}                  onEdit={handleEdit}                  {...project}                <ProjectCard              <div key={project.id} data-project-card>            {projects.map((project) => (          <div className={styles.projectsList} ref={projectsListRef}>        ) : (          </div>            <div className={styles.emptyText}>{t('projectsEmptyText')}</div>            <div className={styles.emptyTitle}>{t('projectsEmptyTitle')}</div>            <div className={styles.emptyIcon}>📂</div>          <div className={styles.emptyState}>        {projects.length === 0 ? (        </div>          </div>            )}              </button>                {t('clearFilters')} ({activeFilters})              <button onClick={clearAllFilters} className={styles.clearFiltersButton} title={t('clearFilters')}>            {activeFilters > 0 && (            </div>              />                className={`${styles.filterInput} ${filterLabel ? styles.filterActive : ''}`}                placeholder={t('searchLabelPlaceholder')}                onChange={(e) => setFilterLabel(e.target.value)}                value={filterLabel}              <input              </select>                <option value="high">{t('priorityHigh')}</option>                <option value="medium">{t('priorityMedium')}</option>                <option value="low">{t('priorityLow')}</option>                <option value="">{t('filterPriorityAll')}</option>              >                className={`${styles.filterSelect} ${filterPriority ? styles.filterActive : ''}`}                onChange={(e) => setFilterPriority(e.target.value)}                value={filterPriority}              <select              </select>                <option value="done">{t('statusDone')}</option>                <option value="in_progress">{t('statusInProgress')}</option>                <option value="pending">{t('statusPending')}</option>                <option value="">{t('filterStatusAll')}</option>              >                className={`${styles.filterSelect} ${filterStatus ? styles.filterActive : ''}`}                onChange={(e) => setFilterStatus(e.target.value)}                value={filterStatus}              <select            <div className={styles.filterGroup}>          <div className={styles.filterBar}>          </button>            {t('createProject')}          <button onClick={handleCreate} className={styles.createButton}>        <div className={styles.toolbar}>      <div className={styles.content}>      </div>        </div>          </div>            <ProfileMenu isOpen={openMenu === 'profile'} onToggle={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')} />            </div>              <SettingsMenu isOpen={openMenu === 'settings'} onToggle={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')} />              <InvitationsBell isOpen={openMenu === 'invitations'} onToggle={() => setOpenMenu(openMenu === 'invitations' ? null : 'invitations')} />              <NotificationsBell isOpen={openMenu === 'notifications'} onToggle={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')} />            <div style={{ display: "flex", gap: "8px" }}>          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>          </div>            <p className={styles.headerSubtitle}>{t('dashboardSubtitle')}</p>            <h1 className={styles.headerTitle}>{t('dashboardTitle')}</h1>          <div>        <div className={styles.headerContent}>      <div className={styles.header} ref={headerRef}>    <div className={styles.container}>
n  return (  }    setFilterLabel("");    setFilterPriority("");    setFilterStatus("");
n  function clearAllFilters() {  }    }        .catch(() => alert(t('createProjectFailed')));        })          loadProjects();          setModalOpen(false);        .then(() => {      createProject(data.name, data.description, token)      // Створення    } else {        .catch(() => alert(t('editProjectFailed')));        })          loadProjects();          setModalOpen(false);        .then(() => {      updateProject(data.id, data.name, data.description, token)      // Редагування    if (modalData) {    const token = localStorage.getItem("token");
n  function handleModalSubmit(data) {  }    }        .catch(() => alert(t('deleteProjectFailed')));        .then(loadProjects)      deleteProject(id, token)      const token = localStorage.getItem("token");    if (window.confirm(t('confirmDeleteProject'))) {
n  function handleDelete(id) {  }    setTasksOpen(true);    setSelectedProject(proj);    if (!proj) return;    const proj = projects.find((p) => p.id === id);
n  function handleOpenTasks(id) {  }    setModalOpen(true);    setModalData(proj);    const proj = projects.find((p) => p.id === id);
n  function handleEdit(id) {  }    setModalOpen(true);    setModalData(null);
n  function handleCreate() {  }    getProjects(token).then(setProjects);    const token = localStorage.getItem("token");
n  function loadProjects() {  }, [projects]);n    // ... (rest of file unchanged) ...