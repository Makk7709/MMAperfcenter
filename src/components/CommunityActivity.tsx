import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

export const CommunityActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("community_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();

    // Subscribe to new activities
    const channel = supabase
      .channel("community-activities-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_activities",
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getInitials = (description: string) => {
    // Extract name from description like "User a terminé: Workout"
    const match = description.match(/^([^a]+)/);
    if (match) {
      const name = match[1].trim();
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "?";
  };

  const getGradientClass = (index: number) => {
    const gradients = [
      "bg-gradient-primary",
      "bg-gradient-secondary",
      "bg-gradient-to-br from-accent to-primary",
      "bg-gradient-to-br from-secondary to-accent",
    ];
    return gradients[index % gradients.length];
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-0 shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-accent" />
          <h3 className="font-semibold">Communauté</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-0 shadow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-accent" />
        <h3 className="font-semibold">Communauté</h3>
        <TrendingUp className="h-4 w-4 ml-auto text-accent" />
      </div>
      
      {activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune activité récente</p>
          <p className="text-xs mt-1">
            Soyez le premier à compléter un workout!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {activities.slice(0, 5).map((activity, index) => (
              <div key={activity.id} className="flex items-center gap-3">
                <Avatar className={`w-10 h-10 ${getGradientClass(index)}`}>
                  <AvatarFallback className="bg-transparent text-primary-foreground font-semibold">
                    {getInitials(activity.description)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full">
            Voir toute l'activité
          </Button>
        </>
      )}
    </Card>
  );
};
