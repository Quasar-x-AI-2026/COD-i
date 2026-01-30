import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

// Create Auth Context
const AuthContext = createContext();

/**
 * AuthProvider Component
 * Manages authentication state for both teachers and students
 * Handles different API payloads from login endpoints
 */
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useState({
    isLoading: true,
    isSignout: false,
    user: null,
    token: null,
    role: null,
    classes: null,
    error: null,
  });

  // Check if user is already logged in on app start
  useEffect(() => {
    bootstrapAsync();
  }, []);

  /**
   * Bootstrap - Check for existing session on app launch
   */
  const bootstrapAsync = async () => {
    try {
      console.log("[AuthContext] Bootstrapping authentication...");

      const token = await AsyncStorage.getItem("authToken");
      const userData = await AsyncStorage.getItem("userData");
      const classesData = await AsyncStorage.getItem("classesData");
      const role = await AsyncStorage.getItem("userRole");

      if (token && userData) {
        console.log("✅ Existing session found");
        const user = JSON.parse(userData);
        const classes = classesData ? JSON.parse(classesData) : null;

        dispatch({
          isLoading: false,
          isSignout: false,
          user: user,
          token: token,
          role: role || user.role,
          classes: classes,
          error: null,
        });
      } else {
        console.log("❌ No existing session found");
        dispatch({
          isLoading: false,
          isSignout: true,
          user: null,
          token: null,
          role: null,
          classes: null,
          error: null,
        });
      }
    } catch (error) {
      console.error("❌ Bootstrap error:", error);
      dispatch({
        isLoading: false,
        isSignout: true,
        user: null,
        token: null,
        role: null,
        classes: null,
        error: error.message,
      });
    }
  };

  /**
   * Login action
   * Handles both teacher and student payloads
   * @param {string} token - JWT token from API
   * @param {object} user - User data (teacher or student)
   * @param {array} classes - Array of classes
   * @param {string} role - User role (TEACHER or student)
   */
  const authContext = {
    login: async (token, user, classes = null, role = null) => {
      try {
        console.log("[AuthContext] Login action triggered");
        console.log(`User: ${user.name}, Role: ${role || user.role}`);

        if (!token || !user) {
          throw new Error("Invalid login credentials");
        }

        const userRole = role || user.role || "student";
        if (token) {
          await AsyncStorage.setItem("authToken", token);
        }

        if (user) {
          await AsyncStorage.setItem("userData", JSON.stringify(user));
        }

        if (userRole) {
          await AsyncStorage.setItem("userRole", userRole);
        }

        if (classes && classes.length > 0) {
          await AsyncStorage.setItem("classesData", JSON.stringify(classes));
        }

        console.log("Auth data saved to AsyncStorage");
        dispatch({
          isLoading: false,
          isSignout: false,
          user: user,
          token: token,
          role: userRole,
          classes: classes,
          error: null,
        });

        console.log(" Auth context updated");
      } catch (error) {
        console.error(" Login error in AuthContext:", error);
        dispatch({
          isLoading: false,
          isSignout: false,
          user: null,
          token: null,
          role: null,
          classes: null,
          error: error.message,
        });
        throw error;
      }
    },

    logout: async () => {
      try {
        console.log("[AuthContext] Logout action triggered");
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.removeItem("userData");
        await AsyncStorage.removeItem("userRole");
        await AsyncStorage.removeItem("userId");
        await AsyncStorage.removeItem("classesData");

        console.log(" Auth data cleared from AsyncStorage");

        dispatch({
          isLoading: false,
          isSignout: true,
          user: null,
          token: null,
          role: null,
          classes: null,
          error: null,
        });

        console.log(" Auth context cleared");
      } catch (error) {
        console.error(" Logout error in AuthContext:", error);
        dispatch({
          isLoading: false,
          isSignout: false,
          user: null,
          token: null,
          role: null,
          classes: null,
          error: error.message,
        });
        throw error;
      }
    },

    register: async (email, password, name) => {
      try {
        console.log("[AuthContext] Register action triggered");
        throw new Error("Registration not implemented yet");
      } catch (error) {
        console.error("❌ Register error:", error);
        dispatch((prev) => ({
          ...prev,
          error: error.message,
        }));
        throw error;
      }
    },

    updateUser: async (updates) => {
      try {
        console.log("[AuthContext] Update user action triggered");

        const updatedUser = { ...state.user, ...updates };
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

        dispatch((prev) => ({
          ...prev,
          user: updatedUser,
        }));

        console.log("✅ User data updated");
      } catch (error) {
        console.error("❌ Update user error:", error);
        throw error;
      }
    },

    updateClasses: async (classes) => {
      try {
        console.log("[AuthContext] Update classes action triggered");

        if (classes && classes.length > 0) {
          await AsyncStorage.setItem("classesData", JSON.stringify(classes));
        }

        dispatch((prev) => ({
          ...prev,
          classes: classes,
        }));

        console.log(` Classes updated: ${classes?.length || 0} classes`);
      } catch (error) {
        console.error("Update classes error:", error);
        throw error;
      }
    },

    getRole: () => {
      return state.role;
    },

    isTeacher: () => {
      return state.role === "TEACHER";
    },

    isStudent: () => {
      return state.role === "student" || state.role === "STUDENT";
    },

    getUser: () => {
      return state.user;
    },
    getToken: () => {
      return state.token;
    },

    getClasses: () => {
      return state.classes;
    },
    clearError: () => {
      dispatch((prev) => ({
        ...prev,
        error: null,
      }));
    },
  };

  return (
    <AuthContext.Provider value={{ ...state, ...authContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export const useAuthState = () => {
  const { isLoading, isSignout, user, token, role } = useAuth();

  return {
    isLoading,
    isSignout,
    isLoggedIn: !isSignout && token !== null,
    user,
    token,
    role,
  };
};

export const useIsAuthenticated = () => {
  const { isSignout, token } = useAuth();
  return !isSignout && token !== null;
};

export const useUserRole = () => {
  const { role, isTeacher, isStudent } = useAuth();

  return {
    role,
    isTeacher,
    isStudent,
  };
};
