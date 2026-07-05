"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Shield,
  Settings,
  BarChart3,
} from "lucide-react";

// Define available permissions
const AVAILABLE_PERMISSIONS = [
  { id: "view_dashboard", label: "View Dashboard", category: "General" },
  { id: "manage_users", label: "Manage Users", category: "User Management" },
  { id: "create_content", label: "Create Content", category: "Content" },
  { id: "edit_content", label: "Edit Content", category: "Content" },
  { id: "delete_content", label: "Delete Content", category: "Content" },
  { id: "view_reports", label: "View Reports", category: "Analytics" },
  { id: "export_data", label: "Export Data", category: "Analytics" },
  { id: "manage_settings", label: "Manage Settings", category: "System" },
  { id: "view_audit_logs", label: "View Audit Logs", category: "System" },
  { id: "manage_billing", label: "Manage Billing", category: "Financial" },
  {
    id: "view_financial_reports",
    label: "View Financial Reports",
    category: "Financial",
  },
];

// Group permissions by category
const PERMISSION_CATEGORIES = AVAILABLE_PERMISSIONS.reduce(
  (acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  },
  {} as Record<string, typeof AVAILABLE_PERMISSIONS>
);

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  permissions: string[];
  createdAt: string;
  lastActive: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@company.com",
      permissions: [
        "view_dashboard",
        "create_content",
        "edit_content",
        "view_reports",
      ],
      createdAt: "2024-01-15",
      lastActive: "2 hours ago",
    },
    {
      id: "2",
      name: "Mike Chen",
      email: "mike@company.com",
      permissions: ["view_dashboard", "manage_users", "view_audit_logs"],
      createdAt: "2024-01-10",
      lastActive: "1 day ago",
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      email: "emily@company.com",
      permissions: [
        "view_dashboard",
        "view_reports",
        "export_data",
        "view_financial_reports",
      ],
      createdAt: "2024-01-08",
      lastActive: "3 hours ago",
    },
  ]);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    permissions: [] as string[],
  });

  const handleAddUser = () => {
    if (newUser.name && newUser.email) {
      const user: User = {
        id: Date.now().toString(),
        name: newUser.name,
        email: newUser.email,
        permissions: newUser.permissions,
        createdAt: new Date().toISOString().split("T")[0],
        lastActive: "Just now",
      };
      setUsers([...users, user]);
      setNewUser({ name: "", email: "", permissions: [] });
      setIsAddUserOpen(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      permissions: [...user.permissions],
    });
  };

  const handleUpdateUser = () => {
    if (editingUser && newUser.name && newUser.email) {
      setUsers(
        users.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                name: newUser.name,
                email: newUser.email,
                permissions: newUser.permissions,
              }
            : user
        )
      );
      setEditingUser(null);
      setNewUser({ name: "", email: "", permissions: [] });
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId));
  };

  const togglePermission = (permissionId: string) => {
    setNewUser((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const getPermissionLabel = (permissionId: string) => {
    return (
      AVAILABLE_PERMISSIONS.find((p) => p.id === permissionId)?.label ||
      permissionId
    );
  };

  const resetForm = () => {
    setNewUser({ name: "", email: "", permissions: [] });
    setEditingUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-muted-foreground">
              Manage subordinates and their permissions
            </p>
          </div>
          <Dialog
            open={isAddUserOpen || !!editingUser}
            onOpenChange={(open) => {
              if (!open) {
                setIsAddUserOpen(false);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddUserOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Edit User" : "Add New User"}
                </DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? "Update user information and permissions"
                    : "Create a new user account and assign permissions"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <Separator />

                {/* Permissions */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Permissions</h3>
                    <p className="text-sm text-muted-foreground">
                      Select the permissions for this user
                    </p>
                  </div>

                  {Object.entries(PERMISSION_CATEGORIES).map(
                    ([category, permissions]) => (
                      <Card key={category}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            {category}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={permission.id}
                                checked={newUser.permissions.includes(
                                  permission.id
                                )}
                                onCheckedChange={() =>
                                  togglePermission(permission.id)
                                }
                              />
                              <Label
                                htmlFor={permission.id}
                                className="text-sm font-normal"
                              >
                                {permission.label}
                              </Label>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddUserOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingUser ? handleUpdateUser : handleAddUser}
                  >
                    {editingUser ? "Update User" : "Add User"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Active subordinates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Permissions</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {AVAILABLE_PERMISSIONS.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Available permissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(PERMISSION_CATEGORIES).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Permission categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Today
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.lastActive.includes("hour")).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Users active today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subordinates</CardTitle>
            <CardDescription>
              Manage your team members and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user.avatar || "/placeholder.svg"}
                          />
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {user.permissions.slice(0, 3).map((permission) => (
                          <Badge
                            key={permission}
                            variant="secondary"
                            className="text-xs"
                          >
                            {getPermissionLabel(permission)}
                          </Badge>
                        ))}
                        {user.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastActive}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
