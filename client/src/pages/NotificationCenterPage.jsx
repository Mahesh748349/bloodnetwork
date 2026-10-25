import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { notificationService } from '../services/notificationService';
import {
  Bell,
  CheckCircle2,
  Clock,
  Droplet,
  ShieldCheck,
  AlertCircle,
  Activity,
  ArrowRight,
} from 'lucide-react';

export const NotificationCenterPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } =
    useNotifications();
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const displayedNotifications = filterUnreadOnly
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'contact_invite':
        return <Droplet className="w-5 h-5 text-rose-600 fill-rose-600" />;
      case 'donor_accepted':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'donor_declined':
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
      case 'status_update':
        return <Activity className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-rose-600" />
            Notification Center
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Emergency broadcast history, contact invitations, and coordination status alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              Mark All as Read
            </button>
          )}

          <button
            onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              filterUnreadOnly
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {filterUnreadOnly ? 'Showing Unread' : `All (${notifications.length})`}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        {displayedNotifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {displayedNotifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => !notif.isRead && markAsRead(notif._id)}
                className={`py-4 px-3 sm:px-4 rounded-2xl transition flex items-start gap-4 ${
                  !notif.isRead ? 'bg-rose-50/40' : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm ${
                        !notif.isRead ? 'font-extrabold text-slate-900' : 'font-bold text-slate-800'
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <span className="text-3xs text-slate-600 font-mono shrink-0">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                  <div className="pt-2 flex items-center justify-between text-2xs">
                    <span className="text-slate-600 capitalize">
                      Channel: {notif.channel} • Status: {notif.deliveryStatus}
                    </span>

                    {notif.bloodRequest && (
                      <Link
                        to={`/requests/${notif.bloodRequest._id || notif.bloodRequest}`}
                        className="font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                      >
                        View Request &rarr;
                      </Link>
                    )}
                  </div>
                </div>

                {!notif.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 mt-2" title="Unread" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 p-4 space-y-2">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">Your notification inbox is clear</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Any direct emergency outreach, donor acceptances, or status alerts will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
