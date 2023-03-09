import { Action, ActionPanel, Form, Icon, List, useNavigation, LocalStorage, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import got from "got";

interface APIKey {
  label: string;
  value: string;
}

interface Project {
  created_at: string;
  id: string;
  name: string;
  object: string;
  metrics?: Array<Metric>;
}

interface Metric {
  id: string;
  description: string;
  name: string;
  period: string;
  unit: string;
  value: number;
  object: string;
  created_at: string;
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [apiKeys, setAPIKeys] = useState<Array<APIKey>>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const valueRaw = await LocalStorage.getItem<string>("api-keys") || "[]";
    const values: Array<APIKey> = JSON.parse(valueRaw);

    setAPIKeys(values.sort((a, b) => a.label.localeCompare(b.label)));
    
    setProjects(
      await Promise.all(values.map(async (apiKey): Promise<Project> => {
        return await fetchProject(apiKey.value);
      }))
    );
  }

  async function handleCreate(apiKey: APIKey) {
    const newAPIKeys = [...apiKeys, apiKey];

    await LocalStorage.setItem("api-keys", JSON.stringify(newAPIKeys))
    setAPIKeys(newAPIKeys.sort((a, b) => a.label.localeCompare(b.label)));
    
    await fetchProjects();
  }

  async function handleDelete(index: number) {
    const newAPIKeys = [...apiKeys];
    newAPIKeys.splice(index, 1);
    
    await LocalStorage.setItem("api-keys", JSON.stringify(newAPIKeys))
    setAPIKeys(newAPIKeys.sort((a, b) => a.label.localeCompare(b.label)));

    await fetchProjects();
  }

  async function handleOpen(index: number) {

  }

  return (
    <List
      isShowingDetail={true}
    >
      <List.Item
        key={"all"}
        icon={Icon.AppWindow}
        title={"All Project"}
        detail={
          <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
                  
                  <List.Item.Detail.Metadata.Label title="Real Time" />
                  {allMetrics(projects).map((metric, index) => {
                    if (metric.period === "P0D") {
                      return (
                        <List.Item.Detail.Metadata.Label key={`${metric.period}-${metric.name}`} title={metric.name} text={formatMetricValue(metric)} />
                      )
                    } else {
                      return null
                    }
                  })}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Last 28 Days" />
                  {allMetrics(projects).map((metric, index) => {
                    if (metric.period === "P28D") {
                      return (
                        <List.Item.Detail.Metadata.Label
                          key={`${metric.period}-${metric.name}`}
                          title={metric.name}
                          text={formatMetricValue(metric)}
                        />
                      )
                    } else {
                      return null
                    }
                  })}
                </List.Item.Detail.Metadata>
          }
        />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <AddAPIKeyAction onCreate={handleCreate} />
            </ActionPanel.Section>
            <ActionPanel.Section>
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      <List.Section title="Projects">
        {projects.map((project, index) => (
          <List.Item
            key={index}
            icon={Icon.Mobile}
            title={project.name}
            detail={
              <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  
                  <List.Item.Detail.Metadata.Label title="Real Time" />
                  {project.metrics && project.metrics.map((metric, index) => {
                    if (metric.period === "P0D") {
                      return (
                        <List.Item.Detail.Metadata.Label key={`${metric.period}-${metric.name}`} title={metric.name} text={formatMetricValue(metric)} />
                      )
                    } else {
                      return null
                    }
                  })}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Last 28 Days" />
                  {project.metrics && project.metrics.map((metric, index) => {
                    if (metric.period === "P28D") {
                      return (
                        <List.Item.Detail.Metadata.Label
                          key={`${metric.period}-${metric.name}`}
                          title={metric.name}
                          text={formatMetricValue(metric)}
                        />
                      )
                    } else {
                      return null
                    }
                  })}
                </List.Item.Detail.Metadata>
              }
            />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <AddAPIKeyAction onCreate={handleCreate} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    shortcut={{ modifiers: ["ctrl"], key: "o" }}
                    url={`https://app.revenuecat.com/projects/${project.id.replace('proj', '')}`}
                  />
                  <DeleteAPIKeyAction onDelete={() => handleDelete(index)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function allMetrics(projects: Array<Project>): Array<Metric> {

  var totalMetrics: Array<Metric> = [];

  projects.forEach((project) => {
    project.metrics?.forEach((metric) => {
      let newTotalMetricIndex = totalMetrics.findIndex((totalMetric) => {
        return metric.id === totalMetric.id
      });

      if (newTotalMetricIndex !== -1) {
        var newTotalMetric = totalMetrics[newTotalMetricIndex];
        newTotalMetric.value = newTotalMetric.value + metric.value;

        totalMetrics[newTotalMetricIndex] = newTotalMetric;
      } else {
        totalMetrics.push({ ...metric});
      }
    })
  });
  
  return totalMetrics;
}

function formatMetricValue(metric: Metric): string {
  if (metric.unit === "#") {
    return `${metric.value}`
  } else if (metric.unit === "$") {
    return `$${metric.value.toFixed(2)}`
  } else {
    return `${metric.value}`;
  }
}

function AddAPIKeyForm(props: { onCreate: (apiKey: APIKey) => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { label: string, value: string }) {
    try {
      const project = await fetchProject(values.value);

      props.onCreate({label: project.name, value: values.value});
      pop();
    } catch(error) {
      console.log(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save API Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="value" title="API Key" />
    </Form>
  );
}

function AddAPIKeyAction(props: { onCreate: (apiKey: APIKey) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Add Project (with API Key)"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<AddAPIKeyForm onCreate={props.onCreate} />}
    />
  );
}

function DeleteAPIKeyAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Remove Project"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      style={Action.Style.Destructive}
      onAction={props.onDelete}
    />
  );
}

async function fetchProject(apiKey: string): Promise<Project> {
  try {
    const { body } = await got.get("https://api.revenuecat.com/v2/projects", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      responseType: "json",
    });

    const project = body["items"][0];
    project.metrics = await fetchOverviewMetrics(apiKey, project.id);;

    return project

    // toast.style = Feedback.Toast.Style.Success;
    // toast.title = "Shared secret";
    // toast.message = "Copied link to clipboard";
  } catch (error) {
    // toast.style = Feedback.Toast.Style.Failure;
    // toast.title = "Failed sharing secret";
    // toast.message = String(error);
    
    throw new Error("Couldn't find a project");
  }
}

async function fetchOverviewMetrics(apiKey: string, projectId: string): Promise<[Metric]> {
  try {
    const { body } = await got.get(`https://api.revenuecat.com/v2/projects/${projectId}/metrics/overview`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      responseType: "json",
    });

    return body["metrics"];

    // toast.style = Feedback.Toast.Style.Success;
    // toast.title = "Shared secret";
    // toast.message = "Copied link to clipboard";
  } catch (error) {
    // toast.style = Feedback.Toast.Style.Failure;
    // toast.title = "Failed sharing secret";
    // toast.message = String(error);
    
    throw new Error("Couldn't find a project");
  }
}