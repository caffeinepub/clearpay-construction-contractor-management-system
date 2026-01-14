import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";

module {
  public type OldActor = {
    projects : Map.Map<Text, {
      id : Text;
      name : Text;
      client : Text;
      startDate : Text;
      endDate : Text;
      unitPrice : Float;
      quantity : Float;
      estimatedAmount : Float;
      contactNumber : Text;
      location : Text;
      notes : Text;
      address : Text;
      attachmentLinks : [Text];
    }>;
  };

  public type NewActor = {
    projects : Map.Map<Text, {
      id : Text;
      name : Text;
      client : Text;
      startDate : Text;
      endDate : Text;
      unitPrice : Float;
      quantity : Float;
      estimatedAmount : Float;
      contactNumber : Text;
      location : Text;
      notes : Text;
      address : Text;
      attachmentLinks : [Text];
    }>;
  };

  public func run(old : OldActor) : NewActor {
    let sortedProjectsList = List.empty<(Text, {
      id : Text;
      name : Text;
      client : Text;
      startDate : Text;
      endDate : Text;
      unitPrice : Float;
      quantity : Float;
      estimatedAmount : Float;
      contactNumber : Text;
      location : Text;
      notes : Text;
      address : Text;
      attachmentLinks : [Text];
    })>();

    for ((id, project) in old.projects.entries()) {
      sortedProjectsList.add((id, project));
    };

    let sortedProjectsArray = sortedProjectsList.toArray().sort(
      func(a, b) {
        Text.compare(a.1.name, b.1.name);
      }
    );

    let sortedProjects = Map.empty<Text, {
      id : Text;
      name : Text;
      client : Text;
      startDate : Text;
      endDate : Text;
      unitPrice : Float;
      quantity : Float;
      estimatedAmount : Float;
      contactNumber : Text;
      location : Text;
      notes : Text;
      address : Text;
      attachmentLinks : [Text];
    }>();

    for ((id, project) in sortedProjectsArray.values()) {
      sortedProjects.add(id, project);
    };

    { projects = sortedProjects };
  };
};
