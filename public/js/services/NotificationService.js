/**
 * NotificationService - Centralized notification system
 *
 * Handles all user notifications, messages, and temporary UI feedback
 * Eliminates scattered notification creation throughout the codebase
 */
class NotificationService {
  constructor(domProvider, container = null) {
    this.domProvider = domProvider;
    this.container = container || document.body;

    this.notifications = new Map();
    this.config = {
      maxNotifications: 5,
      defaultDuration: 3000,
      animationDuration: 300,
      positions: {
        'top-right': { top: '20px', right: '20px' },
        'top-left': { top: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' },
        'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
      },
      defaultPosition: 'top-right'
    };

    this.setupStyles();
  }

  /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, success, warning, error)
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
  show(message, type = 'info', options = {}) {
    const id = this.generateId();

    const notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
      options: {
        duration: options.duration || this.config.defaultDuration,
        position: options.position || this.config.defaultPosition,
        persistent: options.persistent || false,
        closable: options.closable !== false,
        html: options.html || false,
        onClick: options.onClick,
        onClose: options.onClose,
        className: options.className || ''
      }
    };

    this.createNotificationElement(notification);
    this.notifications.set(id, notification);

    // Limit number of notifications
    this.enforceMaxNotifications();

    // Auto-remove if not persistent
    if (!notification.options.persistent && notification.options.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, notification.options.duration);
    }

    return id;
  }

  /**
     * Create notification DOM element
     * @param {Object} notification - Notification data
     */
  createNotificationElement(notification) {
    const element = this.domProvider.createElement('div', {
      id: `notification-${notification.id}`,
      className: `notification notification-${notification.type} ${notification.options.className}`.trim(),
      'data-notification-id': notification.id
    });

    // Set content
    if (notification.options.html) {
      element.innerHTML = notification.message;
    } else {
      element.textContent = notification.message;
    }

    // Add close button if closable
    if (notification.options.closable) {
      const closeBtn = this.domProvider.createElement('button', {
        className: 'notification-close',
        textContent: '×',
        'aria-label': 'Close notification'
      });

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(notification.id);
      });

      element.appendChild(closeBtn);
    }

    // Add click handler
    if (notification.options.onClick) {
      element.addEventListener('click', notification.options.onClick);
      element.style.cursor = 'pointer';
    }

    // Set position
    this.positionElement(element, notification.options.position);

    // Add to container
    this.container.appendChild(element);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      element.classList.add('notification-visible');
    });

    // Store element reference
    notification.element = element;
  }

  /**
     * Position notification element
     * @param {HTMLElement} element - Notification element
     * @param {string} position - Position key
     */
  positionElement(element, position) {
    const positionStyles = this.config.positions[position] || this.config.positions[this.config.defaultPosition];

    element.style.position = 'fixed';
    element.style.zIndex = '10000';

    Object.entries(positionStyles).forEach(([property, value]) => {
      element.style[property] = value;
    });
  }

  /**
     * Remove a notification
     * @param {string} id - Notification ID
     * @returns {boolean} True if notification was removed
     */
  remove(id) {
    const notification = this.notifications.get(id);
    if (!notification || !notification.element) {
      return false;
    }

    // Trigger exit animation
    notification.element.classList.add('notification-removing');

    setTimeout(() => {
      if (notification.element && notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }

      // Call onClose callback
      if (notification.options.onClose) {
        notification.options.onClose(notification);
      }

      this.notifications.delete(id);
    }, this.config.animationDuration);

    return true;
  }

  /**
     * Remove all notifications
     */
  removeAll() {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.remove(id));
  }

  /**
     * Remove notifications of specific type
     * @param {string} type - Notification type
     */
  removeByType(type) {
    const toRemove = Array.from(this.notifications.values())
      .filter(notification => notification.type === type)
      .map(notification => notification.id);

    toRemove.forEach(id => this.remove(id));
  }

  /**
     * Update existing notification
     * @param {string} id - Notification ID
     * @param {Object} updates - Updates to apply
     * @returns {boolean} True if notification was updated
     */
  update(id, updates) {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    // Update message
    if (updates.message !== undefined) {
      notification.message = updates.message;
      if (notification.element) {
        if (notification.options.html) {
          notification.element.innerHTML = updates.message;
        } else {
          notification.element.textContent = updates.message;
        }
      }
    }

    // Update type/class
    if (updates.type !== undefined) {
      if (notification.element) {
        notification.element.classList.remove(`notification-${notification.type}`);
        notification.element.classList.add(`notification-${updates.type}`);
      }
      notification.type = updates.type;
    }

    return true;
  }

  /**
     * Convenience methods for different notification types
     */
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', { duration: 5000, ...options });
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', { duration: 4000, ...options });
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  /**
     * Show loading notification
     * @param {string} message - Loading message
     * @param {Object} options - Options
     * @returns {string} Notification ID
     */
  loading(message = 'Loading...', options = {}) {
    return this.show(message, 'loading', {
      persistent: true,
      closable: false,
      ...options
    });
  }

  /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Confirm callback
     * @param {Function} onCancel - Cancel callback
     * @param {Object} options - Options
     * @returns {string} Notification ID
     */
  confirm(message, onConfirm, onCancel, options = {}) {
    const confirmElement = this.domProvider.createElement('div', {
      className: 'notification-confirm'
    });

    // Message
    const messageElement = this.domProvider.createElement('div', {
      className: 'notification-message',
      textContent: message
    });

    // Buttons
    const buttonContainer = this.domProvider.createElement('div', {
      className: 'notification-buttons'
    });

    const confirmBtn = this.domProvider.createElement('button', {
      className: 'notification-btn notification-btn-confirm',
      textContent: options.confirmText || 'Confirm'
    });

    const cancelBtn = this.domProvider.createElement('button', {
      className: 'notification-btn notification-btn-cancel',
      textContent: options.cancelText || 'Cancel'
    });

    const notificationId = this.generateId();

    confirmBtn.addEventListener('click', () => {
      this.remove(notificationId);
      if (onConfirm) onConfirm();
    });

    cancelBtn.addEventListener('click', () => {
      this.remove(notificationId);
      if (onCancel) onCancel();
    });

    buttonContainer.appendChild(confirmBtn);
    buttonContainer.appendChild(cancelBtn);
    confirmElement.appendChild(messageElement);
    confirmElement.appendChild(buttonContainer);

    return this.show(confirmElement.outerHTML, 'confirm', {
      html: true,
      persistent: true,
      closable: false,
      position: 'center',
      ...options
    });
  }

  /**
     * Enforce maximum notification limit
     */
  enforceMaxNotifications() {
    const notifications = Array.from(this.notifications.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    while (notifications.length > this.config.maxNotifications) {
      const oldest = notifications.shift();
      this.remove(oldest.id);
    }
  }

  /**
     * Generate unique notification ID
     * @returns {string} Unique ID
     */
  generateId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
     * Setup notification styles
     */
  setupStyles() {
    // Check if styles already exist
    if (document.getElementById('notification-styles')) {
      return;
    }

    const styles = `
            .notification {
                background: var(--card, #ffffff);
                border: 1px solid var(--border, #e2e8f0);
                border-radius: var(--radius, 6px);
                padding: 12px 16px;
                box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
                min-width: 300px;
                max-width: 500px;
                font-family: inherit;
                font-size: 14px;
                line-height: 1.4;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                position: relative;
                word-wrap: break-word;
            }

            .notification-visible {
                opacity: 1;
                transform: translateX(0);
            }

            .notification-removing {
                opacity: 0;
                transform: translateX(100%);
            }

            .notification-success {
                border-left: 4px solid #10b981;
                background: #f0fdf4;
                color: #065f46;
            }

            .notification-error {
                border-left: 4px solid #ef4444;
                background: #fef2f2;
                color: #991b1b;
            }

            .notification-warning {
                border-left: 4px solid #f59e0b;
                background: #fffbeb;
                color: #92400e;
            }

            .notification-info {
                border-left: 4px solid #3b82f6;
                background: #eff6ff;
                color: #1e40af;
            }

            .notification-loading {
                border-left: 4px solid #6b7280;
                background: #f9fafb;
                color: #374151;
            }

            .notification-confirm {
                border-left: 4px solid #8b5cf6;
                background: #faf5ff;
                color: #581c87;
            }

            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                color: inherit;
                opacity: 0.6;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notification-close:hover {
                opacity: 1;
            }

            .notification-buttons {
                margin-top: 12px;
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }

            .notification-btn {
                padding: 6px 12px;
                border-radius: 4px;
                border: 1px solid;
                background: transparent;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            }

            .notification-btn-confirm {
                background: #3b82f6;
                border-color: #3b82f6;
                color: white;
            }

            .notification-btn-confirm:hover {
                background: #2563eb;
                border-color: #2563eb;
            }

            .notification-btn-cancel {
                background: transparent;
                border-color: #6b7280;
                color: #6b7280;
            }

            .notification-btn-cancel:hover {
                background: #f3f4f6;
                border-color: #4b5563;
                color: #4b5563;
            }
        `;

    // Create style element safely, fallback to document.createElement if domProvider is not available
    let styleElement;
    if (this.domProvider && typeof this.domProvider.createElement === 'function') {
      styleElement = this.domProvider.createElement('style', {
        id: 'notification-styles',
        innerHTML: styles
      });
    } else {
      // Fallback to native DOM methods
      styleElement = document.createElement('style');
      styleElement.id = 'notification-styles';
      styleElement.innerHTML = styles;
    }

    document.head.appendChild(styleElement);
  }

  /**
     * Get active notifications
     * @returns {Array} Array of active notifications
     */
  getActiveNotifications() {
    return Array.from(this.notifications.values());
  }

  /**
     * Get notification by ID
     * @param {string} id - Notification ID
     * @returns {Object|null} Notification or null
     */
  getNotification(id) {
    return this.notifications.get(id) || null;
  }

  /**
     * Configure service settings
     * @param {Object} config - Configuration updates
     */
  configure(config) {
    Object.assign(this.config, config);
  }

  /**
     * Dispose of the service
     */
  dispose() {
    this.removeAll();

    // Remove styles
    const styleElement = document.getElementById('notification-styles');
    if (styleElement) {
      styleElement.parentNode.removeChild(styleElement);
    }

    this.notifications.clear();
  }

  /**
     * Get service status for debugging
     * @returns {Object} Service status
     */
  getStatus() {
    return {
      activeNotifications: this.notifications.size,
      config: { ...this.config },
      notifications: this.getActiveNotifications().map(n => ({
        id: n.id,
        type: n.type,
        message: n.message.substring(0, 50) + (n.message.length > 50 ? '...' : ''),
        timestamp: n.timestamp
      }))
    };
  }
}

export default NotificationService;
