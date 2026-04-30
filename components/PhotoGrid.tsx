import PhotoGridItem from "@/components/PhotoGridItem";
import type { Photo } from "@/types/collage";

interface PhotoGridProps {
  photos: Photo[];
  expandedPhotoId: string | null;
  newPhotoId?: string | null;
  onToggleExpand: (photoId: string) => void;
  onToggleItem: (photoId: string, itemId: string) => void;
  onDeletePhoto: (photoId: string) => void;
}

export default function PhotoGrid({
  photos,
  expandedPhotoId,
  newPhotoId,
  onToggleExpand,
  onToggleItem,
  onDeletePhoto,
}: PhotoGridProps) {
  if (photos.length === 0) {
    return <p className="cork-empty">Upload your first photo.</p>;
  }

  return (
    <div className="photo-board">
      {photos.map((photo) => (
        <PhotoGridItem
          key={photo.id}
          photo={photo}
          isExpanded={expandedPhotoId === photo.id}
          isNew={newPhotoId === photo.id}
          onToggleExpand={onToggleExpand}
          onToggleItem={onToggleItem}
          onDeletePhoto={onDeletePhoto}
        />
      ))}
    </div>
  );
}
